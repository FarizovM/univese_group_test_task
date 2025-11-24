import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../services/prisma.service';
import { ErrorLogService } from '../services/error-log.service';
import { validateEventPayload } from '../utils/event-validator';
import { Event } from '../types/events';

@Controller()
export class EventProcessorController {
    private readonly logger = new Logger(EventProcessorController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly errorLogService: ErrorLogService,
    ) { }

    @EventPattern('event.process')
    async handleEvent(@Payload() data: any) {
        const validationResult = validateEventPayload(data);

        if (!validationResult.valid) {
            const message = `Invalid event payload: ${validationResult.errors.join(', ')}`;
            this.logger.warn(message);
            await this.errorLogService.logError({
                level: 'warn',
                message,
                context: EventProcessorController.name,
                eventId: data?.eventId,
                metadata: { errors: validationResult.errors, rawPayload: data },
            });
            return;
        }

        const event = validationResult.event as Event;

        try {

            let eventTime = new Date(event.timestamp);

            if (isNaN(eventTime.getTime())) {
                this.logger.warn(`⚠️ Invalid timestamp for event ${event.eventId}: "${event.timestamp}". Using current time.`);
                eventTime = new Date();
            }

            const amount = extractPurchaseAmount(event);

            await this.prisma.event.create({
                data: {
                    externalId: event.eventId,
                    source: event.source,
                    eventType: event.eventType,
                    eventTime: eventTime,
                    payload: JSON.parse(JSON.stringify(event)),
                    amount,
                },
            });
            this.logger.log(`✅ Successfully saved event: ${event.eventId}`);

        } catch (error) {
            if (error.code === 'P2002') {
                this.logger.warn(`⚠️ Duplicate event skipped: ${event.eventId}`);
                await this.errorLogService.logError({
                    level: 'warn',
                    message: `Duplicate event skipped: ${event.eventId}`,
                    context: EventProcessorController.name,
                    eventId: event.eventId,
                    errorCode: error.code,
                    metadata: { eventType: event.eventType, source: event.source },
                });
            } else {
                this.logger.error(`❌ Error saving event: ${error.message}`, error.stack);
                await this.errorLogService.logException(
                    error,
                    EventProcessorController.name,
                    event.eventId,
                    { eventType: event.eventType, source: event.source },
                );
            }
        }
    }
}

function extractPurchaseAmount(event: Event): number | null {
    if (event.source === 'facebook') {
        const engagement = event.data.engagement;
        if ('purchaseAmount' in engagement && engagement.purchaseAmount) {
            return parseAmount(engagement.purchaseAmount);
        }
    }

    if (event.source === 'tiktok') {
        const engagement = event.data.engagement;
        if ('purchaseAmount' in engagement && engagement.purchaseAmount) {
            return parseAmount(engagement.purchaseAmount);
        }
    }

    return null;
}

function parseAmount(amount: string): number | null {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : null;
}