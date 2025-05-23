<template>
  <div class="accounts" :class="{ show: showAccounts }">
    <div class="accounts__overlay" @click="close()" />
    <div class="accounts__wrap" :class="{ show: showAccounts }">
      <BaseInputDebounced
        placeholder="Search Accounts"
        @update:value-debounced="updateSearchInput"
      />
      <custom-scrollbar
        class="accounts__scroll-area"
        :settings="scrollSettings({ suppressScrollX: true })"
      >
        <accounts-list-item
          v-for="(account, index) in displayActive"
          :key="index"
          :name="account.name"
          :address="network.displayAddress(account.address)"
          :amount="accountInfo.activeBalances[index]"
          :symbol="network.currencyName"
          :is-checked="accountInfo.selectedAccount?.address == account.address"
          :select="selectAccount"
          :active="true"
          :identicon-element="network.identicon"
          :show-edit="true"
          :deletable="account.walletType !== WalletType.mnemonic"
          @action:rename="renameAccount(index)"
          @action:delete="deleteAccount(index)"
        />

        <div v-if="displayInactive.length > 0" class="accounts__info">
          Incompatible accounts
        </div>

        <accounts-list-item
          v-for="(account, index) in displayInactive"
          :key="index"
          :name="account.name"
          :address="account.address"
          :is-checked="false"
          :active="false"
          :identicon-element="network.identicon"
        />
        <div
          v-if="displayInactive.length === 0 && displayActive.length === 0"
          class="accounts__info"
        >
          Accounts not found
        </div>
      </custom-scrollbar>

      <div class="accounts__action">
        <a class="accounts__action-button" @click="addAccountAction()">
          <add-account />
          Add account
        </a>

        <div
          v-if="
            hwWallet.isNetworkSupported(network.name) ||
            network.signer[0] === SignerType.secp256k1
          "
          class="accounts__action-divider"
        />

        <a
          v-if="hwWallet.isNetworkSupported(network.name)"
          class="accounts__action-button hardware"
          @click="openHardware(network.name)"
        >
          <add-hardware-account />
          Add hardware wallet account
        </a>

        <a
          v-if="network.provider !== ProviderName.kadena"
          class="accounts__action-button import"
          @click="importAction"
        >
          <import-account-icon />
          Import account from another wallet
        </a>
      </div>
    </div>
  </div>

  <add-account-form v-model="isAddAccount" v-bind="$attrs" :network="network" />

  <rename-account-form
    v-if="isRenameAccount"
    v-model="isRenameAccount"
    v-bind="$attrs"
    :account="accountToRename"
    :network="network"
  />

  <delete-account-form
    v-if="isDeleteAccount"
    v-model="isDeleteAccount"
    v-bind="$attrs"
    :account="accountToDelete"
  />

  <import-account
    v-bind="$attrs"
    v-model="isImportAccount"
    :network="network"
  />
</template>

<script setup lang="ts">
import AccountsListItem from './components/accounts-list-item.vue';
import CustomScrollbar from '@action/components/custom-scrollbar/index.vue';
import AddAccount from '@action/icons/common/add-account.vue';
import AddAccountForm from './components/add-account-form.vue';
import RenameAccountForm from './components/rename-account-form.vue';
import DeleteAccountForm from './components/delete-account-form.vue';
import AddHardwareAccount from '@action/icons/actions/add-hardware-account.vue';
import ImportAccountIcon from '@action/icons/actions/import-account-icon.vue';
import ImportAccount from '@action/views/import-account/index.vue';
import BaseInputDebounced from '@action/components/base-input-debounced/index.vue';
import { AccountsHeaderData } from '../../types/account';
import { PropType, ref, computed } from 'vue';
import openHardware from '@/libs/utils/open-hardware';
import scrollSettings from '@/libs/utils/scroll-settings';
import { EnkryptAccount } from '@enkryptcom/types';
import HWwallets from '@enkryptcom/hw-wallets';
import { SignerType } from '@enkryptcom/types';
import { BaseNetwork } from '@/types/base-network';
import { WalletType } from '@enkryptcom/types';
import { ProviderName } from '@/types/provider';

const emit = defineEmits<{
  (e: 'addressChanged', account: EnkryptAccount): void;
}>();
const isAddAccount = ref(false);
const isRenameAccount = ref(false);
const isDeleteAccount = ref(false);
const isImportAccount = ref(false);
const hwWallet = new HWwallets();
const props = defineProps({
  network: {
    type: Object as PropType<BaseNetwork>,
    default: () => ({}),
  },
  accountInfo: {
    type: Object as PropType<AccountsHeaderData>,
    default: () => ({}),
  },
  showAccounts: Boolean,
  toggle: {
    type: Function,
    default: () => ({}),
  },
});
const accountToRename = ref<EnkryptAccount>();
const accountToDelete = ref<EnkryptAccount>();

const close = () => {
  props.toggle();
};
const selectAccount = (address: string) => {
  for (const acc of props.accountInfo.activeAccounts) {
    if (props.network.displayAddress(acc.address) === address) {
      emit('addressChanged', acc);
      break;
    }
  }
  setTimeout(() => {
    props.toggle();
  }, 100);
};
const addAccountAction = () => {
  props.toggle();

  setTimeout(() => {
    isAddAccount.value = true;
  }, 100);
};

const renameAccount = (accountIdx: number) => {
  accountToRename.value = props.accountInfo.activeAccounts[accountIdx];
  props.toggle();
  setTimeout(() => {
    isRenameAccount.value = true;
  }, 100);
};

const deleteAccount = (accountIdx: number) => {
  accountToDelete.value = props.accountInfo.activeAccounts[accountIdx];
  props.toggle();

  setTimeout(() => {
    isDeleteAccount.value = true;
  }, 100);
};
const importAction = () => {
  props.toggle();

  setTimeout(() => {
    isImportAccount.value = true;
  }, 100);
};

/*
  ========================
    Search
  ========================
*/
const searchInput = ref('');

const updateSearchInput = (value: string) => {
  searchInput.value = value;
};

function filterAndSortAccounts(accounts: EnkryptAccount[]) {
  // Filter accounts where the name or address contains inputText
  const filteredAccounts = accounts.filter(
    account =>
      account.name.toLowerCase().includes(searchInput.value.toLowerCase()) ||
      account.address.toLowerCase().includes(searchInput.value.toLowerCase()),
  );

  // Sort the filtered accounts
  return filteredAccounts.sort((a, b) => {
    const aNameStartsWith = a.name
      .toLowerCase()
      .startsWith(searchInput.value.toLowerCase());
    const bNameStartsWith = b.name
      .toLowerCase()
      .startsWith(searchInput.value.toLowerCase());
    const aAddressStartsWith = a.address
      .toLowerCase()
      .startsWith(searchInput.value.toLowerCase());
    const bAddressStartsWith = b.address
      .toLowerCase()
      .startsWith(searchInput.value.toLowerCase());

    // Prioritize objects that start with searchInput.value
    if (aNameStartsWith || aAddressStartsWith) {
      if (!(bNameStartsWith || bAddressStartsWith)) {
        return -1; // a starts with searchInput.value, b does not
      }
    } else if (bNameStartsWith || bAddressStartsWith) {
      return 1; // b starts with searchInput.value, a does not
    }

    // If both or neither start with searchInput.value, sort alphabetically
    const aPrimary = (
      a.name.toLowerCase().startsWith(searchInput.value.toLowerCase())
        ? a.name
        : a.address
    ).toLowerCase();
    const bPrimary = (
      b.name.toLowerCase().startsWith(searchInput.value.toLowerCase())
        ? b.name
        : b.address
    ).toLowerCase();

    return aPrimary.localeCompare(bPrimary);
  });
}

const displayActive = computed(() => {
  if (!searchInput.value || searchInput.value === '') {
    return props.accountInfo.activeAccounts;
  }
  return filterAndSortAccounts(props.accountInfo.activeAccounts);
});
const displayInactive = computed(() => {
  if (!searchInput.value || searchInput.value === '') {
    return props.accountInfo.inactiveAccounts;
  }
  return filterAndSortAccounts(props.accountInfo.inactiveAccounts);
});
</script>

<style lang="less">
@import '@action/styles/theme.less';
@import '@action/styles/custom-scroll.less';

.accounts {
  width: 800px;
  height: 600px;
  position: absolute;
  left: -340px;
  top: 0;
  z-index: 105;
  display: none;

  &.show {
    display: block;
  }

  &__overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    z-index: 106;
  }

  &__wrap {
    position: absolute;
    width: 344px;
    height: auto;
    max-height: 530px;
    left: 348px;
    top: 50px;
    background: #ffffff;
    box-shadow:
      0px 3px 6px rgba(0, 0, 0, 0.039),
      0px 7px 24px rgba(0, 0, 0, 0.19);
    border-radius: 12px;
    z-index: 107;
    overflow: hidden;
    padding-top: 56px;
    box-sizing: border-box;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.3s,
      visibility 0s ease-in-out 0.3s;
    padding-bottom: 153px;

    &.show {
      opacity: 1;
      visibility: visible;
      transition-delay: 0s;
    }
  }

  &__scroll-area {
    position: relative;
    margin: auto;
    width: 100%;
    height: 420px;
    padding-bottom: 100px !important;
    padding-right: 8px !important;
  }

  &__info {
    padding: 24px 12px 0 60px;
    font-style: normal;
    font-weight: 400;
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0.5px;
    color: @secondaryLabel;

    a {
      color: @primaryLabel;

      &:hover {
        text-decoration: none;
      }
    }
  }

  &__action {
    height: fit-content;
    max-height: 153px;
    left: 0px;
    bottom: 0px;
    width: 100%;
    background: @white;
    box-shadow:
      0px 0px 6px rgba(0, 0, 0, 0.05),
      0px 0px 1px rgba(0, 0, 0, 0.25);
    position: absolute;
    padding: 8px;
    box-sizing: border-box;

    &-button {
      display: flex;
      box-sizing: border-box;
      justify-content: flex-start;
      align-items: center;
      flex-direction: row;
      height: 40px;
      padding: 10px 16px 10px 8px;
      font-style: normal;
      font-weight: normal;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.25px;
      color: @primaryLabel;
      text-decoration: none;
      cursor: pointer;
      width: 144px;
      transition: background 300ms ease-in-out;
      border-radius: 10px;

      &.hardware {
        width: 100%;
      }

      &.import {
        width: 100%;
      }

      &.active,
      &:hover {
        background: @black007;
      }
      svg {
        margin-right: 8px;
      }
    }

    &-divider {
      height: 1px;
      width: 312px;
      margin: 8px;
      background: @gray02;
    }
  }
}
</style>
