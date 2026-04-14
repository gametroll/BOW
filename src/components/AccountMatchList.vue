<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useInvoiceStore } from '../stores/invoiceStore'

const invoiceStore = useInvoiceStore()

const { matchingAccounts, selectedChargeCategories, selectedConfiguration } = storeToRefs(invoiceStore)
const searchQuery = ref('')

const accountsWithTotals = computed(() =>
  matchingAccounts.value.map((account) => {
    const includedItems = account.chargeTemplates.filter((item) =>
      selectedChargeCategories.value.includes(item.category),
    )

    const estimatedAmount = includedItems.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.price || 0)
    }, 0)

    return {
      ...account,
      estimatedAmount,
      includedItems,
    }
  }),
)

const filteredAccounts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return accountsWithTotals.value
  }

  return accountsWithTotals.value.filter((account) => {
    const haystack = [account.name, account.billingEmail, account.owner, account.status]
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))
}
</script>

<template>
  <section class="rounded-2xl bg-white p-6 shadow-sm">
    <div class="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 class="text-2xl font-bold">Matched Accounts</h2>
        <p class="mt-2 text-sm text-slate-600">
          Accounts currently matched to
          <span class="font-medium text-slate-900">
            {{ selectedConfiguration?.name || 'the selected configuration' }}
          </span>
          and ready for the next billing run.
        </p>
      </div>

      <div class="flex w-full flex-col gap-3 md:w-auto md:items-end">
        <label class="block md:min-w-[320px]">
          <span class="sr-only">Search accounts</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search name, email, owner, or status"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
          />
        </label>

        <div class="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {{ filteredAccounts.length }} of {{ accountsWithTotals.length }} account(s)
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="account in filteredAccounts"
        :key="account.id"
        class="rounded-xl border border-slate-200 p-4"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-slate-900">{{ account.name }}</h3>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {{ account.status }}
              </span>
            </div>

            <div class="mt-2 space-y-1 text-sm text-slate-600">
              <p>{{ account.billingEmail }}</p>
              <p>Owner: {{ account.owner }}</p>
              <p>Last billed period: {{ account.lastBilledPeriod }}</p>
            </div>
          </div>

          <div class="rounded-xl bg-slate-50 px-4 py-3 text-left md:min-w-[220px]">
            <p class="text-sm text-slate-500">Estimated invoice amount</p>
            <p class="mt-2 text-lg font-semibold text-slate-900">
              {{ formatCurrency(account.estimatedAmount) }}
            </p>
          </div>
        </div>

        <div class="mt-4 border-t border-slate-200 pt-4">
          <p class="mb-2 text-sm font-medium text-slate-700">Included billing items</p>

          <div class="space-y-2">
            <div
              v-for="item in account.includedItems"
              :key="`${account.id}-${item.description}-${item.category}`"
              class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
            >
              <span>{{ item.description }}</span>
              <span>
                {{ item.category }} · {{ item.quantity }} x {{ formatCurrency(item.price) }}
              </span>
            </div>

            <div
              v-if="!account.includedItems.length"
              class="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500"
            >
              No charge items currently map to the enabled steps in this configuration.
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!filteredAccounts.length"
        class="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500"
      >
        No accounts matched your search.
      </div>
    </div>
  </section>
</template>
