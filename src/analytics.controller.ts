import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface TopCountryResult {
  country: string;
  total_events: number;
}

interface TopDeviceResult {
  device: string;
  total_events: number;
}
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
            source: el.source,
            eventType: el.eventType,
            count: el._count.externalId ?? null,
            amountSum: (el._sum.amount) ? Number(el._sum.amount) : null,
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
            amountSum: (el._sum.amount ) ? Number(el._sum.amount) : null,
        }))

        const totalRevenue = await this.prisma.event.aggregate({
            _sum: {
                amount: true,
            },
        });

         const totalEvents = await this.prisma.event.aggregate({
            _count:{
                eventId: true,
            },
            _sum: {
                amount: true,
            },
        });

        return {
            status: 200,
            totalEvents,
            revenue: (totalRevenue._sum.amount) ? Number(totalRevenue._sum.amount) : null,
            breakdownSource,
            breakdown: breakdownSourceEventType,
        };
    }

    @Get('errors')
    async getErrors(
        @Query('page') page?: string,
        @Query('level') level?: string,
        @Query('context') context?: string,
        @Query('limit') limit?: string,
    ) {
        const take = limit ? Math.min(parseInt(limit, 10), 100) : 50;
        const pageNumber = page ? Math.max(parseInt(page, 10), 1) : 1;
        const skip = take * (pageNumber - 1) || 0;

        const where: any = {};
        if (level) {
            where.level = level;
        }
        if (context) {
            where.context = context;
        }

        const errors = await this.prisma.errorLog.findMany({
            where,
            skip,
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

        const breakdownErrorStats = errorStats.map(el => ({
            count: el._count.errorId,
            level: el?.level,
            context: el?.context

        }))

        const total = await this.prisma.errorLog.aggregate({
            _count: {
                errorId: true,
            }
        })

        return {
            status: 200,
            total: total._count.errorId,
            stats: breakdownErrorStats,
            errors
        };
    }

    @Get('top-countries')
    async getTopCountries(
        @Query('limit') limit?: string,
    ) {
        const formattedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 10;

        const stats = await this.prisma.$queryRaw<TopCountryResult[]>`
        SELECT 
            payload->'data'->'user'->'location'->>'country' as country,
            COUNT(*)::integer as "totalEvents"
        FROM integration.events
        WHERE payload->'data'->'user'->'location'->>'country' IS NOT NULL
        GROUP BY country
        ORDER BY "totalEvents" DESC
        LIMIT ${formattedLimit}
        `;

        return {status: (stats?.length)? 200 : 204, stats};
    }

    @Get('top-devices')
    async getTopDevices(
         @Query('limit') limit?: string,
    ) {
         const formattedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 10;

        const stats = await this.prisma.$queryRaw<TopDeviceResult[]>`
        SELECT 
            payload->'data'->'engagement'->>'device' as device,
            COUNT(*)::integer as "totalEvents"
        FROM integration.events
        WHERE payload->'data'->'engagement'->>'device' IS NOT NULL
        GROUP BY device
        ORDER BY "totalEvents" DESC
        LIMIT ${formattedLimit}
        `;

        return {status: (stats?.length)? 200 : 204, stats};
    }
}
