import { useCallback, useEffect, useState } from "react";

import {
getBankAccounts,
getWallet,
withdraw,
} from "@/utils/monetization/services/monetization";

import type {
BankAccount,
Wallet,
WithdrawalRequest,
WithdrawalResponse,
} from "@/utils/monetization/types/monetization";

interface UseWalletReturn {
wallet: Wallet | null;
bankAccounts: BankAccount[];

loading: boolean;
withdrawing: boolean;

error: string | null;
withdrawalError: string | null;

refresh: () => Promise<void>;

withdrawFunds: (
payload: WithdrawalRequest
) => Promise<WithdrawalResponse | null>;

clearError: () => void;
clearWithdrawalError: () => void;
}

export function useWallet(): UseWalletReturn {
const [wallet, setWallet] = useState<Wallet | null>(null);
const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

const [loading, setLoading] = useState(true);
const [withdrawing, setWithdrawing] = useState(false);

const [error, setError] = useState<string | null>(null);
const [withdrawalError, setWithdrawalError] =
useState<string | null>(null);

/**

* Load wallet and bank accounts.
  */
  const refresh = useCallback(async () => {
  setLoading(true);
  setError(null);

try {
  const [walletData, accounts] = await Promise.all([
    getWallet(),
    getBankAccounts(),
  ]);

  setWallet(walletData);
  setBankAccounts(accounts);
} catch (err) {
  const message =
    err instanceof Error
      ? err.message
      : "Unable to load your wallet.";

  setError(message);
} finally {
  setLoading(false);
}

}, []);

/**

* Load wallet when the hook mounts.
  */
  useEffect(() => {
  void refresh();
  }, [refresh]);

/**

* Withdraw available earnings.
  */
  const withdrawFunds = useCallback(
  async (
  payload: WithdrawalRequest
  ): Promise<WithdrawalResponse | null> => {
  setWithdrawing(true);
  setWithdrawalError(null);
  
  try {
  const response = await withdraw(payload);
  
  /*
  * Update the local wallet immediately when
  * the backend returns the new balance.
  */
  if (
  response.newAvailableBalance !== undefined &&
  wallet
  ) {
  setWallet((current) =>
  current
  ? {
  ...current,
  availableBalance:
  response.newAvailableBalance!,
  }
  : current
  );
  }
  
  /*
  * Refresh wallet data after a successful withdrawal
  * so pending balance, last payout, etc. stay accurate.
  */
  await refresh();
  
  return response;
  } catch (err) {
  const message =
  err instanceof Error
  ? err.message
  : "Unable to process your withdrawal.";
  
  setWithdrawalError(message);
  
  return null;
  } finally {
  setWithdrawing(false);
  }
  },
  [refresh, wallet]
  );

const clearError = useCallback(() => {
setError(null);
}, []);

const clearWithdrawalError = useCallback(() => {
setWithdrawalError(null);
}, []);

return {
wallet,
bankAccounts,

loading,
withdrawing,

error,
withdrawalError,

refresh,

withdrawFunds,

clearError,
clearWithdrawalError,

};
}

export default useWallet;