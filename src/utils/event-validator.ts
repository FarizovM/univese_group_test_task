import {
    Event,
    FacebookBottomEventType,
    FacebookEngagementBottom,
    FacebookEngagementTop,
    FacebookEvent,
    FacebookTopEventType,
    FunnelStage,
    TiktokBottomEventType,
    TiktokEngagementBottom,
    TiktokEngagementTop,
    TiktokEvent,
    TiktokTopEventType,
} from '../types/events';

type ValidationSuccess = { valid: true; event: Event };
type ValidationFailure = { valid: false; errors: string[] };
export type EventValidationResult = ValidationSuccess | ValidationFailure;

const funnelStages = new Set<FunnelStage>(['top', 'bottom']);
const facebookTopEventTypes = new Set<FacebookTopEventType>([
    'ad.view',
    'page.like',
    'comment',
    'video.view',
]);
const facebookBottomEventTypes = new Set<FacebookBottomEventType>([
    'ad.click',
    'form.submission',
    'checkout.complete',
]);
const tiktokTopEventTypes = new Set<TiktokTopEventType>([
    'video.view',
    'like',
    'share',
    'comment',
]);
const tiktokBottomEventTypes = new Set<TiktokBottomEventType>([
    'profile.visit',
    'purchase',
    'follow',
]);

const facebookReferrers = new Set<FacebookEngagementTop['referrer']>([
    'newsfeed',
    'marketplace',
    'groups',
]);
const facebookClickPositions = new Set<
    FacebookEngagementBottom['clickPosition']
>(['top_left', 'bottom_right', 'center']);
const facebookDevices = new Set<FacebookEngagementBottom['device']>([
    'mobile',
    'desktop',
]);
const facebookBrowsers = new Set<FacebookEngagementBottom['browser']>([
    'Chrome',
    'Firefox',
    'Safari',
]);
const tiktokDevices = new Set<TiktokEngagementTop['device']>([
    'Android',
    'iOS',
    'Desktop',
]);

const genders = new Set(['male', 'female', 'non-binary']);

export function validateEventPayload(payload: unknown): EventValidationResult {
    const errors: string[] = [];

    if (!isRecord(payload)) {
        return { valid: false, errors: ['Payload must be an object'] };
    }

    if (!isNonEmptyString(payload.eventId)) {
        errors.push('eventId must be a non-empty string');
    }

    if (!isNonEmptyString(payload.timestamp)) {
        errors.push('timestamp must be a non-empty string');
    }

    if (!isNonEmptyString(payload.source)) {
        errors.push('source must be a non-empty string');
    }

    if (!isNonEmptyString(payload.eventType)) {
        errors.push('eventType must be a non-empty string');
    }

    if (!isNonEmptyString(payload.funnelStage)) {
        errors.push('funnelStage must be provided');
    } else if (!funnelStages.has(payload.funnelStage as FunnelStage)) {
        errors.push(`Unsupported funnelStage "${payload.funnelStage}"`);
    }

    if (!isRecord(payload.data)) {
        errors.push('data must be an object');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    const source = payload.source;
    if (source === 'facebook') {
        const facebookValidation = validateFacebookEvent(payload);
        return facebookValidation.valid
            ? { valid: true, event: payload as FacebookEvent }
            : facebookValidation;
    }

    if (source === 'tiktok') {
        const tiktokValidation = validateTiktokEvent(payload);
        return tiktokValidation.valid
            ? { valid: true, event: payload as TiktokEvent }
            : tiktokValidation;
    }

    return {
        valid: false,
        errors: [`Unsupported source "${payload.source}"`],
    };
}

function validateFacebookEvent(event: any): ValidationFailure | { valid: true } {
    const errors: string[] = [];

    if (event.funnelStage === 'top') {
        if (!facebookTopEventTypes.has(event.eventType)) {
            errors.push(
                `Unsupported Facebook top eventType "${event.eventType}"`,
            );
        }
    } else if (event.funnelStage === 'bottom') {
        if (!facebookBottomEventTypes.has(event.eventType)) {
            errors.push(
                `Unsupported Facebook bottom eventType "${event.eventType}"`,
            );
        }
    }

    if (!validateFacebookUser(event.data?.user)) {
        errors.push('Invalid Facebook user payload');
    }

    const engagement = event.data?.engagement;
    if (event.funnelStage === 'top') {
        if (!validateFacebookEngagementTop(engagement)) {
            errors.push('Invalid Facebook top engagement payload');
        }
    } else if (event.funnelStage === 'bottom') {
        if (!validateFacebookEngagementBottom(engagement)) {
            errors.push('Invalid Facebook bottom engagement payload');
        }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

function validateTiktokEvent(event: any): ValidationFailure | { valid: true } {
    const errors: string[] = [];

    if (event.funnelStage === 'top') {
        if (!tiktokTopEventTypes.has(event.eventType)) {
            errors.push(
                `Unsupported Tiktok top eventType "${event.eventType}"`,
            );
        }
    } else if (event.funnelStage === 'bottom') {
        if (!tiktokBottomEventTypes.has(event.eventType)) {
            errors.push(
                `Unsupported Tiktok bottom eventType "${event.eventType}"`,
            );
        }
    }

    if (!validateTiktokUser(event.data?.user)) {
        errors.push('Invalid Tiktok user payload');
    }

    const engagement = event.data?.engagement;
    if (event.funnelStage === 'top') {
        if (!validateTiktokEngagementTop(engagement)) {
            errors.push('Invalid Tiktok top engagement payload');
        }
    } else if (event.funnelStage === 'bottom') {
        if (!validateTiktokEngagementBottom(engagement)) {
            errors.push('Invalid Tiktok bottom engagement payload');
        }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

function validateFacebookUser(user: unknown): boolean {
    if (!isRecord(user)) {
        return false;
    }

    return (
        isNonEmptyString(user.userId) &&
        isNonEmptyString(user.name) &&
        isNumber(user.age) &&
        genders.has(user.gender) &&
        isRecord(user.location) &&
        isNonEmptyString(user.location.country) &&
        isNonEmptyString(user.location.city)
    );
}

function validateTiktokUser(user: unknown): boolean {
    if (!isRecord(user)) {
        return false;
    }

    return (
        isNonEmptyString(user.userId) &&
        isNonEmptyString(user.username) &&
        isNumber(user.followers)
    );
}

function validateFacebookEngagementTop(
    engagement: unknown,
): engagement is FacebookEngagementTop {
    if (!isRecord(engagement)) {
        return false;
    }

    return (
        isNonEmptyString(engagement.actionTime) &&
        facebookReferrers.has(engagement.referrer) &&
        (isNonEmptyString(engagement.videoId) || engagement.videoId === null)
    );
}

function validateFacebookEngagementBottom(
    engagement: unknown,
): engagement is FacebookEngagementBottom {
    if (!isRecord(engagement)) {
        return false;
    }

    return (
        isNonEmptyString(engagement.adId) &&
        isNonEmptyString(engagement.campaignId) &&
        facebookClickPositions.has(engagement.clickPosition) &&
        facebookDevices.has(engagement.device) &&
        facebookBrowsers.has(engagement.browser) &&
        (isNonEmptyString(engagement.purchaseAmount) ||
            engagement.purchaseAmount === null)
    );
}

function validateTiktokEngagementTop(
    engagement: unknown,
): engagement is TiktokEngagementTop {
    if (!isRecord(engagement)) {
        return false;
    }

    return (
        isNumber(engagement.watchTime) &&
        isNumber(engagement.percentageWatched) &&
        tiktokDevices.has(engagement.device) &&
        isNonEmptyString(engagement.country) &&
        isNonEmptyString(engagement.videoId)
    );
}

function validateTiktokEngagementBottom(
    engagement: unknown,
): engagement is TiktokEngagementBottom {
    if (!isRecord(engagement)) {
        return false;
    }

    return (
        isNonEmptyString(engagement.actionTime) &&
        (isNonEmptyString(engagement.profileId) ||
            engagement.profileId === null) &&
        (isNonEmptyString(engagement.purchasedItem) ||
            engagement.purchasedItem === null) &&
        (isNonEmptyString(engagement.purchaseAmount) ||
            engagement.purchaseAmount === null)
    );
}

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

