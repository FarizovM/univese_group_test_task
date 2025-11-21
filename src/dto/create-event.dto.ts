// src/dto/create-event.dto.ts
import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    eventId: string;

    @IsString()
    @IsNotEmpty()
    timestamp: string;

    @IsString()
    source: string;

    @IsString()
    eventType: string;

    @IsObject()
    data: any;
}