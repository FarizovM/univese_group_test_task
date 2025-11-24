import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @IsString()
    @IsNotEmpty()
    timestamp: string;

    @IsString()
    @IsNotEmpty()
    source: string;

    @IsString()
    @IsNotEmpty()
    eventType: string;

    @IsObject()
    data: any;

    // funnelStage може бути опціональним або відсутнім у деяких івентах
    @IsOptional()
    @IsString()
    funnelStage?: string;
}