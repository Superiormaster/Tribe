import { useCallback, useState } from "react";

import { withdraw } from "@/utils/monetization/services/monetization";

import type {
WithdrawalRequest,
WithdrawalResponse,
} from "@/utils/monetization/types/monetization";

interface UseWithdrawReturn {
withdrawing: boolean;
success: boolean;

error: string | null;
response: WithdrawalResponse | null;

submitWithdrawal: (
payload: WithdrawalRequest
) => Promise<WithdrawalResponse | null>;

reset: () => void;
clearError: () => void;
}

export function useWithdraw(): UseWithdrawReturn {
const [withdrawing, setWithdrawing] = useState(false);
const [success, setSuccess] = useState(false);

const [error, setError] = useState<string | null>(null);
const [response, setResponse] =
useState<WithdrawalResponse | null>(null);

const submitWithdrawal = useCallback(
async (
payload: WithdrawalRequest
): Promise<WithdrawalResponse | null> => {
setWithdrawing(true);
setSuccess(false);
setError(null);
setResponse(null);

  try {
    if (!payload.amount || payload.amount <= 0) {
      throw new Error(
        "Enter a valid withdrawal amount."
      );
    }

    if (!payload.bankAccountId) {
      throw new Error(
        "Please select a bank account."
      );
    }

    const result = await withdraw(payload);

    if (!result.success) {
      throw new Error(
        result.message ||
          "Withdrawal could not be completed."
      );
    }

    setResponse(result);
    setSuccess(true);

    return result;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unable to process your withdrawal.";

    setError(message);

    return null;
  } finally {
    setWithdrawing(false);
  }
},
[]

);

const reset = useCallback(() => {
setWithdrawing(false);
setSuccess(false);
setError(null);
setResponse(null);
}, []);

const clearError = useCallback(() => {
setError(null);
}, []);

return {
withdrawing,
success,

error,
response,

submitWithdrawal,

reset,
clearError,

};
}

export default useWithdraw;