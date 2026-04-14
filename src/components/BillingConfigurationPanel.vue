<script setup>
import { storeToRefs } from 'pinia'
import { useInvoiceStore } from '../stores/invoiceStore'

const invoiceStore = useInvoiceStore()

const {
  billingPeriod,
  billingRunProgress,
  isBillingRunInProgress,
  matchingAccounts,
  selectedBillingRun,
  selectedScheduleSummary,
  selectedRunAmountSummary,
  selectedConfiguration,
} = storeToRefs(invoiceStore)

function formatDateTime(value) {
  if (!value) return ''

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusClasses(status) {
  if (status === 'Completed') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (status === 'Skipped') {
    return 'bg-slate-200 text-slate-700'
  }

  if (status === 'Running') {
    return 'bg-sky-100 text-sky-800'
  }

  if (status === 'Queued') {
    return 'bg-slate-100 text-slate-700'
  }

  return 'bg-amber-100 text-amber-800'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatCountdown(countdown) {
  if (!countdown) {
    return {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    }
  }

  return {
    days: String(countdown.days).padStart(2, '0'),
    hours: String(Math.floor((countdown.totalSeconds % 86400) / 3600)).padStart(2, '0'),
    minutes: String(countdown.minutes % 60).padStart(2, '0'),
    seconds: String(countdown.seconds).padStart(2, '0'),
  }
}

function getCountdownSegments(countdown) {
  const formatted = formatCountdown(countdown)
  const segments = []

  if (formatted.days !== '00') {
    segments.push({ label: 'DAYS', value: formatted.days })
  }

  if (formatted.days !== '00' || formatted.hours !== '00') {
    segments.push({ label: 'HOURS', value: formatted.hours })
  }

  segments.push({ label: 'MINS', value: formatted.minutes })
  segments.push({ label: 'SECS', value: formatted.seconds })

  return segments
}
</script>

<template>
  <section class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
    <section class="rounded-2xl bg-white p-6 shadow-sm">
      <div class="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-slate-500">Billing Run</p>
          <h2 class="text-2xl font-bold">
            {{ selectedConfiguration?.name || 'No configuration selected' }}
          </h2>
          <p class="mt-2 text-sm text-slate-500">
            Cadence:
            <span class="font-medium text-slate-900">
              {{ selectedConfiguration?.cadence || 'Not set' }}
            </span>
          </p>
          <p class="mt-2 text-sm text-slate-600">
            Run the selected billing workflow for
            <span class="font-medium text-slate-900">{{ billingPeriod }}</span>
            and review exactly how each step will execute.
          </p>
        </div>

        <button
          type="button"
          class="rounded-xl px-4 py-2 text-sm font-medium text-white transition"
          :class="
            isBillingRunInProgress
              ? 'bg-emerald-500/70'
              : selectedBillingRun
                ? 'bg-slate-400'
                : selectedScheduleSummary.isScheduled
                  ? 'bg-amber-500 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500'
          "
          :disabled="
            isBillingRunInProgress ||
            Boolean(selectedBillingRun) ||
            selectedScheduleSummary.isScheduled
          "
          @click="invoiceStore.runBilling"
        >
          <span
            v-if="isBillingRunInProgress"
            class="block text-center"
          >
            Running Billing...
          </span>

          <span
            v-else-if="selectedBillingRun"
            class="block text-center"
          >
            Already Run
          </span>

          <span
            v-else-if="selectedScheduleSummary.isScheduled"
            class="grid auto-cols-fr grid-flow-col gap-2 text-center"
          >
            <span
              v-for="segment in getCountdownSegments(selectedScheduleSummary.countdown)"
              :key="segment.label"
              class="block"
            >
              <span class="block text-lg leading-none tabular-nums">
                {{ segment.value }}
              </span>
              <span class="mt-1 block text-[10px] font-semibold tracking-[0.18em]">
                {{ segment.label }}
              </span>
            </span>
          </span>

          <span
            v-else
            class="block text-center"
          >
            Run Billing
          </span>
        </button>
      </div>

      <div
        v-if="isBillingRunInProgress"
        class="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4"
      >
        <div class="flex items-center gap-3">
          <div class="h-3 w-3 animate-pulse rounded-full bg-sky-500" />
          <div>
            <p class="font-medium text-sky-900">Billing run in progress</p>
            <p class="text-sm text-sky-800">
              Demo-only delay is enabled so users can see each step progress before invoices are generated.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Run Progression</h3>
          <span class="text-sm text-slate-500">
            {{ billingRunProgress.length }} step(s)
          </span>
        </div>

        <div class="space-y-4">
          <div
            v-for="(step, index) in billingRunProgress"
            :key="step.id"
            class="relative rounded-xl border p-4 transition"
            :class="
              step.status === 'Running'
                ? 'border-sky-300 bg-sky-50 shadow-sm'
                : 'border-slate-200 bg-white'
            "
          >
            <div
              v-if="index < billingRunProgress.length - 1"
              class="absolute left-[calc(1.05rem+17px)] top-12 h-[calc(100%+0.75rem)] w-px bg-slate-200"
            />

            <div class="flex items-start gap-4">
              <div class="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {{ index + 1 }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 class="font-semibold text-slate-900">{{ step.name }}</h4>
                    <p class="mt-1 text-sm text-slate-600">{{ step.description }}</p>
                  </div>

                  <span
                    class="rounded-full px-2 py-1 text-xs font-medium"
                    :class="statusClasses(step.status)"
                  >
                    {{ step.status }}
                  </span>
                </div>

                <div class="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {{ step.result }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="rounded-2xl bg-white p-6 shadow-sm">
      <h3 class="text-lg font-semibold">Run Snapshot</h3>

      <div class="mt-6 space-y-4">
        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Amount Snapshot</p>
          <p class="mt-2 text-2xl font-semibold text-slate-900">
            {{
              isBillingRunInProgress
                ? formatCurrency(selectedRunAmountSummary.currentTotal)
                : selectedBillingRun
                  ? formatCurrency(selectedRunAmountSummary.finalInvoicedAmount)
                  : formatCurrency(selectedRunAmountSummary.estimatedTotal)
            }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            {{
              isBillingRunInProgress
                ? `In progress: ${formatCurrency(selectedRunAmountSummary.completedAmount)} completed and ${formatCurrency(selectedRunAmountSummary.activeAmount)} currently being processed.`
                : selectedBillingRun
                  ? `Final amount invoiced for this run. Estimated before run: ${formatCurrency(selectedRunAmountSummary.estimatedTotal)}.`
                  : `Estimated amount if this billing period is run now.`
            }}
          </p>

          <div
            v-if="isBillingRunInProgress"
            class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              class="h-full rounded-full bg-emerald-500 transition-all duration-500"
              :style="{
                width: `${selectedRunAmountSummary.estimatedTotal > 0 ? Math.min((selectedRunAmountSummary.currentTotal / selectedRunAmountSummary.estimatedTotal) * 100, 100) : 0}%`,
              }"
            />
          </div>
        </div>

        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Run Status</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            {{
              isBillingRunInProgress
                ? 'Billing in progress'
                : selectedBillingRun
                  ? 'Already run'
                  : selectedScheduleSummary.isScheduled
                    ? 'Scheduled'
                  : 'Ready to run'
            }}
          </p>
          <p class="mt-1 text-sm text-slate-600">
            {{
              isBillingRunInProgress
                ? 'Demo mode is intentionally pacing each step so the workflow is easy to follow.'
                : selectedBillingRun
                  ? formatDateTime(selectedBillingRun.ranAt)
                  : selectedScheduleSummary.isScheduled
                    ? `Scheduled for ${formatDateTime(selectedScheduleSummary.scheduledFor)}.`
                  : 'No billing run exists yet for this period.'
            }}
          </p>
        </div>

        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Description</p>
          <p class="mt-2 text-sm text-slate-700">
            {{ selectedConfiguration?.description || 'No description available.' }}
          </p>
        </div>

        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Enabled Step Types</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="step in selectedConfiguration?.steps || []"
              :key="step.id"
              class="rounded-full px-2 py-1 text-xs font-medium"
              :class="step.enabled ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'"
            >
              {{ step.name }}
            </span>
          </div>
        </div>

        <div class="rounded-xl bg-slate-50 p-4">
          <p class="text-sm text-slate-500">Matched Accounts</p>
          <div class="mt-3 space-y-2">
            <div
              v-for="account in matchingAccounts"
              :key="account.id"
              class="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700"
            >
              <span>{{ account.name }}</span>
              <span class="text-slate-500">{{ account.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </section>
</template>
