# **🧠 Test Task — Backend Engineer (Node.js | NATS)**

**Team:** MarTech

**Level:** Middle

**Stack:** TypeScript · NestJS · PostgreSQL · NATS · Docker Compose

---

## **👋 Introduction**

Thank you for your interest in joining **MarTech** team at **GuruApps**!

This assignment is designed to evaluate how you approach **event-driven backend systems** — from ingestion to persistence and reporting — using modern Node.js tooling.

We’re not only looking for code that *works*, but also for **engineering judgment**: how you structure, document, and reason about a production-grade solution.

---

## **🧭 Task Overview**

You’ll build a backend system that processes **high-throughput event data** coming from a **Dockerized publisher** via webhooks.

Your system should demonstrate:

- robust **event ingestion**
- reliable **persistence**
- thoughtful **reporting or analytics**
- qualities of **production readiness** in design and implementation

---

## **📡 Event Source**

A ready-to-use publisher image is available on Docker Hub: [andriiuni/events](https://hub.docker.com/r/andriiuni/events)

This container emits events via HTTP POST requests to a webhook you define.

To connect it, your service must expose an HTTP endpoint (e.g. /webhook) and pass its URL through the environment variable:

```bash
EVENT_ENDPOINT=http://your-service:port/webhook
```

When the publisher starts, it will continuously send JSON events to that endpoint.

---

## **🔁 Flow Description**

1. configure your service to receive events at an endpoint (e.g. /webhook)
2. forward these events to **NATS** for asynchronous, reliable delivery
3. ingest and **persist** the data into **PostgreSQL**
4. expose one or more **API endpoints** for analytics or reports based on the stored data

> 🧩 You’re free to decide
>
- how to structure services and modules (monolith vs. microservices)
- service boundaries, data models, error handling, scaling approach
- how to handle observability, retries, and delivery semantics
- what kind of reports make sense from the received data

---

## **🏗 Production Readiness**

Your implementation should reflect your own understanding of what makes a system *production-ready*.

We’re interested in how you approach:

- **reliability**
- **observability**
- **scalability**
- **maintainability**

You’re free to decide how to demonstrate these qualities — via metrics, health checks, logs, migrations, or other mechanisms you find appropriate.

We’ll evaluate not by strict checklists but by the soundness of your design and the clarity of your reasoning.

<aside>
⚡

The full infra should start with a single command: `docker-compose up`

</aside>

---

## **📊 Reporting Layer**

Design and expose at least one meaningful **reporting API** that surfaces useful insight from your stored events.

Examples (you can choose your own):

- Aggregated spend or counts over time
- Top entities by activity
- Country-level breakdowns

The goal is to show your ability to transform raw data into structured, queryable information.

---

## **📤 Next Steps**

Please submit your solution as a public **GitHub repository link**.

---

## **🧱 Event Data Specification**

---

- Duplicates and out-of-order events may occur.
- Expect short bursts of up to a few thousand events per minute.

### **🧩 TypeScript Definitions**

```tsx
export type FunnelStage = "top" | "bottom";

export type FacebookTopEventType = "ad.view" | "page.like" | "comment" | "video.view";
export type FacebookBottomEventType = "ad.click" | "form.submission" | "checkout.complete";
export type FacebookEventType = FacebookTopEventType | FacebookBottomEventType;

export interface FacebookUserLocation {
  country: string;
  city: string;
}

export interface FacebookUser {
  userId: string;
  name: string;
  age: number;
  gender: "male" | "female" | "non-binary";
  location: FacebookUserLocation;
}

export interface FacebookEngagementTop {
  actionTime: string;
  referrer: "newsfeed" | "marketplace" | "groups";
  videoId: string | null;
}

export interface FacebookEngagementBottom {
  adId: string;
  campaignId: string;
  clickPosition: "top_left" | "bottom_right" | "center";
  device: "mobile" | "desktop";
  browser: "Chrome" | "Firefox" | "Safari";
  purchaseAmount: string | null;
}

export type FacebookEngagement = FacebookEngagementTop | FacebookEngagementBottom;

export interface FacebookEvent {
  eventId: string;
  timestamp: string;
  source: "facebook";
  funnelStage: FunnelStage;
  eventType: FacebookEventType;
  data: {
    user: FacebookUser;
    engagement: FacebookEngagement;
  };
}

export type TiktokTopEventType = "video.view" | "like" | "share" | "comment";
export type TiktokBottomEventType = "profile.visit" | "purchase" | "follow";
export type TiktokEventType = TiktokTopEventType | TiktokBottomEventType;

export interface TiktokUser {
  userId: string;
  username: string;
  followers: number;
}

export interface TiktokEngagementTop {
  watchTime: number;
  percentageWatched: number;
  device: "Android" | "iOS" | "Desktop";
  country: string;
  videoId: string;
}

export interface TiktokEngagementBottom {
  actionTime: string;
  profileId: string | null;
  purchasedItem: string | null;
  purchaseAmount: string | null;
}

export type TiktokEngagement = TiktokEngagementTop | TiktokEngagementBottom;

export interface TiktokEvent {
  eventId: string;
  timestamp: string;
  source: "tiktok";
  funnelStage: FunnelStage;
  eventType: TiktokEventType;
  data: {
    user: TiktokUser;
    engagement: TiktokEngagement;
  };
}

export type Event = FacebookEvent | TiktokEvent;

```
