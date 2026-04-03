"""Plaid API service layer."""
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.products import Products

from ..config import get_settings


def get_plaid_client() -> plaid_api.PlaidApi:
    settings = get_settings()
    env_map = {
        "sandbox": plaid.Environment.Sandbox,
        "development": plaid.Environment.Development,
        "production": plaid.Environment.Production,
    }
    configuration = plaid.Configuration(
        host=env_map.get(settings.PLAID_ENV, plaid.Environment.Sandbox),
        api_key={
            "clientId": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def create_link_token(user_id: int) -> str:
    """Creates a link token for Plaid Link frontend widget. Returns link_token string."""
    client = get_plaid_client()
    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="LifeOS",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
    )
    response = client.link_token_create(request)
    return response["link_token"]


def exchange_public_token(public_token: str) -> str:
    """Exchanges public token for access token. Returns access_token."""
    client = get_plaid_client()
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return response["access_token"]


def sync_transactions(access_token: str, cursor: str = None) -> dict:
    """
    Uses transactions/sync endpoint.
    Returns {"added": [...], "modified": [...], "removed": [...], "next_cursor": str}
    Each transaction has: transaction_id, account_id, name, amount, date,
      personal_finance_category.primary, personal_finance_category.detailed,
      merchant_name, pending, logo_url
    """
    client = get_plaid_client()

    kwargs = {"access_token": access_token}
    if cursor:
        kwargs["cursor"] = cursor

    request = TransactionsSyncRequest(**kwargs)
    response = client.transactions_sync(request)

    added = []
    for txn in response["added"]:
        pfc = txn.get("personal_finance_category") or {}
        added.append({
            "transaction_id": txn["transaction_id"],
            "account_id": txn["account_id"],
            "name": txn["name"],
            "amount": txn["amount"],
            "date": txn["date"],
            "category": pfc.get("primary") if pfc else None,
            "category_detailed": pfc.get("detailed") if pfc else None,
            "merchant_name": txn.get("merchant_name"),
            "pending": txn.get("pending", False),
            "logo_url": txn.get("logo_url"),
        })

    modified = []
    for txn in response["modified"]:
        pfc = txn.get("personal_finance_category") or {}
        modified.append({
            "transaction_id": txn["transaction_id"],
            "account_id": txn["account_id"],
            "name": txn["name"],
            "amount": txn["amount"],
            "date": txn["date"],
            "category": pfc.get("primary") if pfc else None,
            "category_detailed": pfc.get("detailed") if pfc else None,
            "merchant_name": txn.get("merchant_name"),
            "pending": txn.get("pending", False),
            "logo_url": txn.get("logo_url"),
        })

    removed = []
    for txn in response["removed"]:
        removed.append({"transaction_id": txn["transaction_id"]})

    return {
        "added": added,
        "modified": modified,
        "removed": removed,
        "next_cursor": response.get("next_cursor", ""),
    }


def get_accounts(access_token: str) -> list:
    """Returns list of accounts with balances."""
    client = get_plaid_client()
    request = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(request)

    accounts = []
    for acct in response["accounts"]:
        balances = acct.get("balances", {})
        accounts.append({
            "account_id": acct["account_id"],
            "name": acct["name"],
            "official_name": acct.get("official_name"),
            "type": str(acct["type"]) if acct.get("type") else "unknown",
            "subtype": str(acct["subtype"]) if acct.get("subtype") else None,
            "current_balance": balances.get("current"),
            "available_balance": balances.get("available"),
            "currency": balances.get("iso_currency_code") or "USD",
            "mask": acct.get("mask"),
        })

    return accounts
