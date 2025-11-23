import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get('stats')
    async getStats() {



        const selectSourceEventType = await this.prisma.event.groupBy({
            by: ['source', 'eventType'],
            _count: {
                externalId: true,
            },
            _sum: {
                amount: true,
            },
        });

        const breakdownSourceEventType = selectSourceEventType.map(el => ({
            count: el._count.externalId ?? null,
            amountSum: el._sum.amount ?? null,
            source: el.source,
            eventType: el.eventType,
        }));

        const selectSource = await this.prisma.event.groupBy({
            by: ['source'],
            _count: {
                externalId: true,
            },
            _sum: {
                amount: true,
            },
        })

        const breakdownSource = selectSource.map(el => ({
            source: el.source,
            count: el._count.externalId ?? null,
            amountSum: el._sum.amount ?? null,
        }))

        const totalRevenue = await this.prisma.event.aggregate({
            _sum: {
                amount: true,
            },
        });

        return {
            revenue: totalRevenue._sum.amount,
            breakdownSource: breakdownSource,
            breakdown: breakdownSourceEventType,
        };
    }

    @Get('errors')
    async getErrors(
        @Query('level') level?: string,
        @Query('context') context?: string,
        @Query('limit') limit?: string,
    ) {
        const take = limit ? Math.min(parseInt(limit, 10), 100) : 100;

        const where: any = {};
        if (level) {
            where.level = level;
        }
        if (context) {
            where.context = context;
        }

        const errors = await this.prisma.errorLog.findMany({
            where,
            take,
            orderBy: {
                createdAt: 'desc',
            },
        });

        const errorStats = await this.prisma.errorLog.groupBy({
            by: ['level', 'context'],
            _count: {
                errorId: true,
            },
        });

        return {
            errors,
            stats: errorStats,
            total: errors.length,
        };
    }
}