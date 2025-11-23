import { Controller, Post, Body, Inject, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleWebhook(@Body() body: any) {
    const events = Array.isArray(body) ? body : [body];

    //this.logger.log(`Received batch of ${events.length} events`);

    events.forEach((event) => {
      this.natsClient.emit('event.process', event).subscribe({
        error: (err) => this.logger.error(`❌ NATS Emit Error: ${err.message}`),
      });
    });

    return { status: 'queued', count: events.length };
  }
}