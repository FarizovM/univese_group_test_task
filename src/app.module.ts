// src/app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './controllers/app.controller';
import { EventProcessorController } from './controllers/event-processor.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { PrismaService } from './services/prisma.service';
import { ErrorLogService } from './services/error-log.service';

@Module({
  imports: [
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
  providers: [PrismaService, ErrorLogService],
})
export class AppModule { }