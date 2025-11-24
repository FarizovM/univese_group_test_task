import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface ErrorLogData {
    level: 'error' | 'warn' | 'info';
    message: string;
    context?: string;
    eventId?: string;
    errorCode?: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class ErrorLogService {
    private readonly logger = new Logger(ErrorLogService.name);

    constructor(private readonly prisma: PrismaService) { }

    async logError(errorData: ErrorLogData): Promise<void> {
        try {
            await this.prisma.errorLog.create({
                data: {
                    level: errorData.level,
                    message: errorData.message,
                    context: errorData.context,
                    eventId: errorData.eventId,
                    errorCode: errorData.errorCode,
                    stackTrace: errorData.stackTrace,
                    metadata: errorData.metadata || {},
                },
            });
        } catch (error) {
            // Якщо не вдалося зберегти помилку в БД, логуємо в консоль
            this.logger.error(
                `Failed to save error log to database: ${error.message}`,
                error.stack,
            );
        }
    }

    async logException(
        error: Error,
        context: string,
        eventId?: string,
        metadata?: Record<string, any>,
    ): Promise<void> {
        await this.logError({
            level: 'error',
            message: error.message,
            context,
            eventId,
            errorCode: (error as any).code,
            stackTrace: error.stack,
            metadata,
        });
    }
}

