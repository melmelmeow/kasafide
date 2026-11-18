import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import Xendit from "xendit-node";

export const appRouter = router({
  properties: router({
    featured: publicProcedure.query(async ({ ctx }) => {
      return ctx.prisma.property.findMany({
        where: {
          status: "approved",
          lifecycleStatus: null,
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: { barangay: true },
      });
    }),
    list: publicProcedure
      .input(
        z.object({
          barangayId: z.number().optional(),
          type: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        return ctx.prisma.property.findMany({
          where: {
            status: "approved",
            lifecycleStatus: null,
            ...(input.barangayId ? { barangayId: input.barangayId } : {}),
            ...(input.type ? { propertyType: input.type } : {}),
          },
          include: { barangay: true },
          take: input.limit,
        });
      }),
    byId: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const property = await ctx.prisma.property.findUnique({
          where: { id: input.id },
          include: { barangay: true, landowner: true },
        });
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }
        return property;
      }),
  }),

  barangays: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return ctx.prisma.barangay.findMany({
        orderBy: { name: "asc" },
      });
    }),
  }),

  payments: router({
    createInvoice: protectedProcedure
      .input(
        z.object({
          propertyId: z.string(),
          purpose: z.string(),
          period: z.string().optional(),
          dueDate: z.string().optional(),
          depositMonths: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const property = await ctx.prisma.property.findUnique({
          where: { id: input.propertyId },
        });
        if (!property) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
        }

        const userId = (ctx.session.user as any).id as string;
        const referenceId = `kf-${Date.now()}-${userId.slice(0, 8)}`;
        const amount = Number(property.price);

        const authHeader = Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64");
        const res = await fetch("https://api.xendit.co/qr_codes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            reference_id: referenceId,
            type: "DYNAMIC",
            currency: "PHP",
            amount,
          }),
        });

        const qr = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const qrString = (qr?.qr_string ?? qr?.qrString ?? null) as string | null;

        const payment = await ctx.prisma.payment.create({
          data: {
            buyerId: userId,
            userId,
            propertyId: property.id,
            amount: property.price,
            purpose: input.purpose,
            period: input.period,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            depositMonths: input.depositMonths,
            status: "pending",
            method: "qr",
            xenditReferenceId: referenceId,
            qrCodeUrl: qrString,
            xenditQrString: qrString,
          },
        });

        return { payment, qr };
      }),

    myPayments: protectedProcedure.query(async ({ ctx }) => {
      const userId = (ctx.session.user as any).id as string;
      return ctx.prisma.payment.findMany({
        where: { buyerId: userId },
        include: { property: true },
        orderBy: { createdAt: "desc" },
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
