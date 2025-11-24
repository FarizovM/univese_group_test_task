import { Controller, Post, Body, Inject, Logger, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEventDto } from '../dto/create-event.dto';
import { ErrorLogService } from '../services/error-log.service';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly errorLogService: ErrorLogService,
  ) { }

  @Post('webhook')
  @Throttle({ webhook: { limit: 50000, ttl: 60 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(@Body() body: any) {
    const events = Array.isArray(body) ? body : [body];

    // Валідація кожного event
    const validatedEvents: CreateEventDto[] = [];

    for (const event of events) {
      const eventDto = plainToInstance(CreateEventDto, event);
      const errors = await validate(eventDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {}).join(', ')).join('; ');
        this.logger.warn(`⚠️ Invalid event received: ${errorMessages}`);

        // Зберігаємо помилку валідації
        await this.errorLogService.logError({
          level: 'warn',
          message: `Invalid event validation: ${errorMessages}`,
          context: AppController.name,
          eventId: event.eventId,
          metadata: { validationErrors: errors, eventData: event },
        });

        throw new BadRequestException(`Invalid event data: ${errorMessages}`);
      }

      validatedEvents.push(eventDto);
    }

    this.logger.log(`✅ Received batch of ${validatedEvents.length} validated events`);

    validatedEvents.forEach((event) => {
      this.natsClient.emit('event.process', event).subscribe({
        error: async (err) => {
          this.logger.error(`❌ NATS Emit Error: ${err.message}`);
          // Зберігаємо помилку NATS
          await this.errorLogService.logException(
            err,
            AppController.name,
            event.eventId,
            { eventType: event.eventType, source: event.source },
          );
        },
      });
    });

    return { status: 'queued', count: validatedEvents.length };
  }
}