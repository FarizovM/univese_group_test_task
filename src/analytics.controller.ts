// src/analytics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('stats')
    async getStats() {
        // Агрегація: Кількість подій по джерелам
        const countBySource = await this.prisma.ingestedEvent.groupBy({
            by: ['source', 'eventType'],
            _count: {
                eventId: true,
            },
        });

        // Агрегація: Сума покупок
        const totalRevenue = await this.prisma.ingestedEvent.aggregate({
            _sum: {
                amount: true,
            },
        });

        return {
            breakdown: countBySource,
            revenue: totalRevenue._sum.amount,
        };
    }
}