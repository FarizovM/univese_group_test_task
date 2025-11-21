// src/event-processor.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';

@Controller()
export class EventProcessorController {
    private readonly logger = new Logger(EventProcessorController.name);

    constructor(private readonly prisma: PrismaService) { }

    @EventPattern('event.process')
    async handleEvent(@Payload() data: any) {
        try {
            // Логіка витягування суми (Amount) для звітності
            // Це спрощена логіка, в реальності треба дивитися типи
            let amount = null;

            if (data.source === 'tiktok' && data.data?.engagement?.purchaseAmount) {
                amount = data.data.engagement.purchaseAmount;
            } else if (data.source === 'facebook' && data.data?.engagement?.purchaseAmount) {
                amount = data.data.engagement.purchaseAmount;
            }

            // Збереження в БД
            // Використовуємо create, але знаємо про constraints
            await this.prisma.ingestedEvent.create({
                data: {
                    eventId: data.eventId,
                    source: data.source,
                    eventType: data.eventType,
                    eventTime: new Date(data.timestamp),
                    payload: data,
                    amount: amount ? parseFloat(amount) : null,
                },
            });

            // this.logger.log(`Event ${data.eventId} processed`);

        } catch (error) {
            // Обробка дублікатів (P2002 - код помилки Unique constraint у Prisma)
            if (error.code === 'P2002') {
                this.logger.warn(`Duplicate event skipped: ${data.eventId}`);
            } else {
                this.logger.error(`Error processing event: ${error.message}`);
                // В реальному проді тут можна кинути виключення, 
                // щоб NATS спробував доставити повідомлення ще раз (Retry)
            }
        }
    }
}