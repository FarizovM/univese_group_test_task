// src/app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './controllers/app.controller';
import { EventProcessorController } from './controllers/event-processor.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { PrismaService } from './services/prisma.service';
import { ErrorLogService } from './services/error-log.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60,
        limit: 600,
      },
      {
        name: 'webhook',
        ttl: 60,
        limit: 50000,
      },
      {
        name: 'analytics',
        ttl: 60,
        limit: 120,
      },
    ]),
    // NATS Register NATS client 
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [AppController, EventProcessorController, AnalyticsController],
  providers: [
    PrismaService,
    ErrorLogService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }