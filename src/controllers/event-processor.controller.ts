import { Controller, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../services/prisma.service';
import { ErrorLogService } from '../services/error-log.service';
import { validateEventPayload } from '../utils/event-validator';
import { Event } from '../types/events';

const BATCH_SIZE = Number(process.env.EVENT_BATCH_SIZE ?? 100);
const BATCH_FLUSH_INTERVAL_MS = Number(process.env.EVENT_BATCH_FLUSH_MS ?? 200);

interface PreparedEventRecord {
    eventId: string;
    source: string;
    eventType: string;
    payload: EventCreateData;
}

interface EventCreateData {
    externalId: string;
    source: string;
    eventType: string;
    eventTime: Date;
    payload: Record<string, any>;
    amount: number | null;
}

@Controller()
export class EventProcessorController implements OnModuleDestroy {
    private readonly logger = new Logger(EventProcessorController.name);
    private readonly buffer: PreparedEventRecord[] = [];
    private flushTimer?: NodeJS.Timeout;
    private flushPromise: Promise<void> | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly errorLogService: ErrorLogService,
    ) { }

    /**
     * Lifecycle hook: викликається при завершенні роботи модуля.
     * Гарантує збереження всіх подій з буфера перед завершенням.
     */
    async onModuleDestroy(): Promise<void> {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        await this.flushBuffer();
    }

    /**
     * Обробник подій з NATS черги.
     * Валідує подію, додає до буфера та ініціює збереження при досягненні ліміту.
     */
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
        const preparedRecord = this.prepareEventRecord(event);

        this.buffer.push(preparedRecord);

        if (this.buffer.length >= BATCH_SIZE) {
            await this.flushBuffer();
        } else {
            this.scheduleFlush();
        }
    }

    /**
     * Підготовка події для збереження в БД.
     * Нормалізує timestamp, витягує суму покупки та формує структуру запису.
     */
    private prepareEventRecord(event: Event): PreparedEventRecord {
        let eventTime = new Date(event.timestamp);

        if (isNaN(eventTime.getTime())) {
            this.logger.warn(`⚠️ Invalid timestamp for event ${event.eventId}: "${event.timestamp}". Using current time.`);
            eventTime = new Date();
        }

        const amount = extractPurchaseAmount(event);

        return {
            eventId: event.eventId,
            source: event.source,
            eventType: event.eventType,
            payload: {
                externalId: event.eventId,
                source: event.source,
                eventType: event.eventType,
                eventTime,
                payload: JSON.parse(JSON.stringify(event)),
                amount,
            },
        };
    }

    /**
     * Планує відкладене збереження буфера через таймаут.
     * Запобігає множинним таймерам - якщо таймер вже активний, нічого не робить.
     */
    private scheduleFlush(): void {
        if (this.flushTimer) {
            return;
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            this.flushBuffer().catch(err => {
                const stack = err instanceof Error ? err.stack : undefined;
                this.logger.error('❌ Scheduled batch flush failed', stack);
            });
        }, BATCH_FLUSH_INTERVAL_MS);
    }

    /**
     * Зберігає всі події з буфера в БД батчем.
     * Запобігає паралельним викликам через flushPromise.
     * Автоматично планує наступне збереження, якщо буфер не порожній.
     */
    private async flushBuffer(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }

        if (this.flushPromise) {
            await this.flushPromise;
            return;
        }

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }

        const batch = this.buffer.splice(0, this.buffer.length);
        this.flushPromise = this.persistBatch(batch);

        try {
            await this.flushPromise;
        } finally {
            this.flushPromise = null;
            if (this.buffer.length > 0) {
                this.scheduleFlush();
            }
        }
    }

    /**
     * Зберігає батч подій в БД через createMany.
     * При помилці батч-вставки намагається зберегти кожну подію окремо.
     */
    private async persistBatch(batch: PreparedEventRecord[]): Promise<void> {
        try {
            const result = await this.prisma.event.createMany({
                data: batch.map(record => record.payload),
                skipDuplicates: true,
            });
            this.logger.log(`✅ Saved batch of ${result.count ?? batch.length} events`);
        } catch (error) {
            this.logger.error(`❌ Batch insert failed for ${batch.length} events: ${error.message}`);
            for (const record of batch) {
                try {
                    await this.prisma.event.create({ data: record.payload });
                    this.logger.log(`✅ Saved event after retry: ${record.eventId}`);
                } catch (singleError) {
                    await this.handlePersistError(singleError, record);
                }
            }
        }
    }

    /**
     * Обробляє помилки збереження події.
     * Логує дублікати (P2002) як warning, інші помилки - як error.
     */
    private async handlePersistError(error: any, record: PreparedEventRecord): Promise<void> {
        if (error.code === 'P2002') {
            this.logger.warn(`⚠️ Duplicate event skipped: ${record.eventId}`);
            await this.errorLogService.logError({
                level: 'warn',
                message: `Duplicate event skipped: ${record.eventId}`,
                context: EventProcessorController.name,
                eventId: record.eventId,
                errorCode: error.code,
                metadata: { eventType: record.eventType, source: record.source },
            });
        } else {
            this.logger.error(`❌ Error saving event ${record.eventId}: ${error.message}`, error.stack);
            await this.errorLogService.logException(
                error,
                EventProcessorController.name,
                record.eventId,
                { eventType: record.eventType, source: record.source },
            );
        }
    }
}

/**
 * Витягує суму покупки з події (якщо є).
 */
function extractPurchaseAmount(event: Event): number | null {
    const engagement = event.data.engagement;
    if ('purchaseAmount' in engagement && engagement.purchaseAmount) {
        return parseAmount(engagement.purchaseAmount);
    }
    return null;
}

/**
 * Парсить рядок з сумою в число.
 * Повертає null для невалідних значень.
 */
function parseAmount(amount: string): number | null {
    const parsed = parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : null;
}