import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('stats')
    async getStats() {
        const countBySource = await this.prisma.event.groupBy({
            by: ['source', 'eventType'],
            _count: {
                externalId: true,
            },
        });

        const totalRevenue = await this.prisma.event.aggregate({
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