// src/app.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { EventProcessorController } from './event-processor.controller';
import { AnalyticsController } from './analytics.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    // Реєструємо клієнт NATS, щоб мати можливість робити .emit()
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
  providers: [PrismaService],
})
export class AppModule { }