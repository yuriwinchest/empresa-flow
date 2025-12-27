-- Function to process Accounts Payable payment
CREATE OR REPLACE FUNCTION process_payment(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_payable 
  WHERE id = p_account_id;

  -- Update Accounts Payable status
  UPDATE accounts_payable
  SET 
    status = 'paid',
    payment_date = p_payment_date,
    amount = p_amount
  WHERE id = p_account_id;

  -- Insert Transaction (Expense)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_payable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'debit',
    p_amount,
    p_payment_date,
    'Pgto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance - p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to process Accounts Receivable receipt
CREATE OR REPLACE FUNCTION process_receipt(
  p_account_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL,
  p_receive_date DATE
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_category_id UUID;
  v_description TEXT;
BEGIN
  -- Get account details
  SELECT company_id, category_id, description 
  INTO v_company_id, v_category_id, v_description
  FROM accounts_receivable 
  WHERE id = p_account_id;

  -- Update Accounts Receivable status
  UPDATE accounts_receivable
  SET 
    status = 'paid',
    receive_date = p_receive_date,
    amount = p_amount
  WHERE id = p_account_id;

  -- Insert Transaction (Income)
  INSERT INTO transactions (
    company_id,
    bank_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    related_receivable_id
  ) VALUES (
    v_company_id,
    p_bank_account_id,
    v_category_id,
    'credit',
    p_amount,
    p_receive_date,
    'Recbto: ' || v_description,
    p_account_id
  );

  -- Update Bank Account Balance
  UPDATE bank_accounts
  SET 
    current_balance = current_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_bank_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;