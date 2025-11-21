import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    // Цей метод спрацьовує, коли NestJS запускає модуль
    async onModuleInit() {
        await this.$connect();
    }

    // Цей метод спрацьовує, коли додаток вимикається (Graceful Shutdown)
    async onModuleDestroy() {
        await this.$disconnect();
    }
}