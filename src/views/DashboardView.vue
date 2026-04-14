<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import billingOpsLogo from '../assets/billing-ops-logo.svg'
import { useInvoiceStore } from '../stores/invoiceStore'
import AccountMatchList from '../components/AccountMatchList.vue'
import BillingConfigurationPanel from '../components/BillingConfigurationPanel.vue'
import BillingConfigurationEditor from '../components/BillingConfigurationEditor.vue'
import InvoiceList from '../components/InvoiceList.vue'
import InvoiceDetail from '../components/InvoiceDetail.vue'

const invoiceStore = useInvoiceStore()

const { billingPeriod, configurationInvoices, matchingAccounts, selectedConfiguration } =
  storeToRefs(invoiceStore)

const tabs = [
  { id: 'billing', label: 'Billing Run', description: 'Run the selected workflow for a period' },
  { id: 'editor', label: 'Edit Config', description: 'Customize billing steps and settings' },
  { id: 'accounts', label: 'Accounts', description: 'Accounts matched to the selected config' },
  { id: 'invoices', label: 'Invoices', description: 'Generated invoice drafts for the run' },
]

const activeTab = ref('billing')
let scheduleTicker = null

function formatPeriod(value) {
  if (!value) return ''

  return new Date(`${value}-01T00:00:00`).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
}

onMounted(() => {
  invoiceStore.tickNow()
  invoiceStore.maybeRunScheduledBilling()

  scheduleTicker = window.setInterval(() => {
    invoiceStore.tickNow()
    invoiceStore.maybeRunScheduledBilling()
  }, 1000)
})

onBeforeUnmount(() => {
  if (scheduleTicker) {
    window.clearInterval(scheduleTicker)
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section class="sticky top-0 z-50 bg-slate-950 text-white shadow-sm">
      <div class="mx-auto max-w-7xl px-6 py-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="group relative inline-flex items-center gap-3">
              <img
                :src="billingOpsLogo"
                alt="BOW logo"
                class="h-10 w-10"
              >
              <h1 class="text-3xl font-bold tracking-tight">Billing Ops Workspace</h1>

              <div class="pointer-events-none absolute left-0 top-full z-10 mt-3 w-80 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 opacity-0 shadow-lg transition group-hover:opacity-100">
                Billing Ops Workspace lets you select a configuration, move to any period, then run or edit the workflow from one place.
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-300">Billing Configuration</span>
              <select
                :value="selectedConfiguration?.id"
                class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-white"
                @change="invoiceStore.selectConfiguration($event.target.value)"
              >
                <option
                  v-for="configuration in invoiceStore.configurations"
                  :key="configuration.id"
                  :value="configuration.id"
                >
                  {{ configuration.name }}
                </option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-sm font-medium text-slate-300">Billing Period</span>
              <input
                :value="billingPeriod"
                type="month"
                class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-white"
                @input="invoiceStore.setBillingPeriod($event.target.value)"
              />
            </label>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl px-6 py-6">
      <section class="mb-6 rounded-2xl bg-white p-2 shadow-sm">
        <div class="grid grid-cols-1 gap-2 md:grid-cols-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="rounded-xl px-4 py-3 text-left transition"
            :class="
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="activeTab = tab.id"
          >
            <div class="flex items-center gap-2 font-semibold">
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.id === 'accounts'"
                class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {{ matchingAccounts.length }}
              </span>
              <span
                v-if="tab.id === 'invoices'"
                class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {{ configurationInvoices.length }}
              </span>
            </div>
            <div
              class="mt-1 text-sm"
              :class="activeTab === tab.id ? 'text-slate-200' : 'text-slate-500'"
            >
              {{ tab.description }}
            </div>
          </button>
        </div>
      </section>

      <BillingConfigurationPanel v-if="activeTab === 'billing'" />

      <BillingConfigurationEditor v-else-if="activeTab === 'editor'" />

      <AccountMatchList v-else-if="activeTab === 'accounts'" />

      <section
        v-else
        class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"
      >
        <InvoiceList />
        <InvoiceDetail />
      </section>
    </div>
  </main>
</template>
