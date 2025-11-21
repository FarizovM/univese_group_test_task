// src/app.controller.ts
import { Controller, Post, Body, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    // Ін'єктимо клієнт для відправки повідомлень в NATS
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  @Post('webhook')
  async handleWebhook(@Body() event: CreateEventDto) {
    // Патерн "Fire and Forget". 
    // Ми не чекаємо, поки база даних збереже запис. 
    // Ми просто кидаємо в чергу і кажемо "Ок".

    this.natsClient.emit('event.process', event);

    // Це дає високу пропускну здатність (High Throughput)
    return { status: 'received' };
  }
}