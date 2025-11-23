import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { ErrorLogService } from './error-log.service';

@Controller()
export class EventProcessorController {
    private readonly logger = new Logger(EventProcessorController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly errorLogService: ErrorLogService,
    ) { }

    @EventPattern('event.process')
    async handleEvent(@Payload() data: any) {
        //this.logger.log(` Received event via NATS: ${data.eventId}`);

        try {

            let eventTime = new Date(data.timestamp);

            if (isNaN(eventTime.getTime())) {
                this.logger.warn(`⚠️ Invalid timestamp for event ${data.eventId}: "${data.timestamp}". Using current time.`);
                eventTime = new Date();
            }

            let amount = null;

            if (data.source === 'tiktok' && data.data?.engagement?.purchaseAmount) {
                amount = data.data.engagement.purchaseAmount;
            } else if (data.source === 'facebook' && data.data?.engagement?.purchaseAmount) {
                amount = data.data.engagement.purchaseAmount;
            }

            await this.prisma.event.create({
                data: {
                    externalId: data.eventId,
                    source: data.source,
                    eventType: data.eventType,
                    eventTime: eventTime,
                    payload: data,
                    amount: amount ? parseFloat(amount) : null,
                },
            });
            this.logger.log(`✅ Successfully saved event: ${data.eventId}`);

        } catch (error) {
            if (error.code === 'P2002') {
                this.logger.warn(`⚠️ Duplicate event skipped: ${data.eventId}`);
                await this.errorLogService.logError({
                    level: 'warn',
                    message: `Duplicate event skipped: ${data.eventId}`,
                    context: EventProcessorController.name,
                    eventId: data.eventId,
                    errorCode: error.code,
                    metadata: { eventType: data.eventType, source: data.source },
                });
            } else {
                this.logger.error(`❌ Error saving event: ${error.message}`, error.stack);
                await this.errorLogService.logException(
                    error,
                    EventProcessorController.name,
                    data.eventId,
                    { eventType: data.eventType, source: data.source },
                );
            }
        }
    }
}