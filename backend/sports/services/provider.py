from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings
from sports.services.cache import SportsCache

class SportsProviderError(Exception):
    """Base exception for sports provider errors."""


class SportsProviderConfigurationError(SportsProviderError):
    """Raised when the provider is not configured correctly."""


class SportsProviderRequestError(SportsProviderError):
    """Raised when the provider request fails."""


class SportsProviderResponseError(SportsProviderError):
    """Raised when the provider returns an unexpected response."""

@dataclass
class ProviderResponse:
    """
    Standardized response returned by a sports provider.
    """

    data: Any
    status_code: int
    endpoint: str
    params: dict[str, Any]

    # Daily API quota
    requests_remaining: int | None = None
    requests_limit: int | None = None

    # Per-minute quota
    rate_limit_remaining: int | None = None
    rate_limit_limit: int | None = None

    @property
    def success(self) -> bool:
        return 200 <= self.status_code < 300

class BaseSportsProvider(ABC):
    """
    Interface every sports provider must implement.

    This allows Tribe to switch providers later without
    rewriting the entire sports backend.
    """

    name: str = "base"

    @abstractmethod
    def get_competitions(self, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_competition(self, competition_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_teams(self, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_team(self, team_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_players(self, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_player(self, player_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_matches(self, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_match(self, match_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_match_events(self, match_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_match_lineups(self, match_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_match_statistics(self, match_id: int, **params) -> ProviderResponse:
        pass

    @abstractmethod
    def get_standings(self, **params) -> ProviderResponse:
        pass

class HTTPBasedSportsProvider(BaseSportsProvider):
    """
    Generic HTTP implementation.

    Provider-specific classes can inherit from this class and
    only define their API endpoints/headers.
    """

    name = "http"

    base_url: str = ""
    timeout: int = 10

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int | None = None,
    ):
        self.api_key = api_key
    
        self.base_url = (
            base_url.rstrip("/")
            if base_url
            else self.base_url.rstrip("/")
        )
    
        if timeout is not None:
            self.timeout = timeout
    
        self.session = requests.Session()
    
        self.session.headers.update(
            {
                "Accept": "application/json",
                "User-Agent": "TribeSports/1.0",
            }
        )
    
        # API quota state
        self.requests_remaining = None
        self.requests_limit = None
    
        self.rate_limit_remaining = None
        self.rate_limit_limit = None

    def _request(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
        method: str = "GET",
    ) -> ProviderResponse:

        if not self.base_url:
            raise SportsProviderConfigurationError(
                "Sports provider base URL is not configured."
            )

        params = params or {}

        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                timeout=self.timeout,
            )
        
        except requests.Timeout as exc:
            raise SportsProviderRequestError(
                f"Sports provider timeout: {endpoint}"
            ) from exc
        
        except requests.RequestException as exc:
            raise SportsProviderRequestError(
                f"Sports provider request failed: {endpoint}"
            ) from exc
        
        self._update_rate_limits(response)
        
        try:
            data = response.json()
        
        except ValueError as exc:
            raise SportsProviderResponseError(
                f"Provider returned invalid JSON: {endpoint}"
            ) from exc
        
        if not response.ok:
            raise SportsProviderRequestError(
                self._build_error_message(
                    endpoint=endpoint,
                    status_code=response.status_code,
                    data=data,
                )
            )
        
        return ProviderResponse(
            data=data,
            status_code=response.status_code,
            endpoint=endpoint,
            params=params,
        
            requests_remaining=self.requests_remaining,
            requests_limit=self.requests_limit,
        
            rate_limit_remaining=self.rate_limit_remaining,
            rate_limit_limit=self.rate_limit_limit,
        )

    def _update_rate_limits(
        self,
        response: requests.Response,
    ) -> None:
    
        remaining = response.headers.get(
            "x-ratelimit-requests-remaining"
        )
    
        limit = response.headers.get(
            "x-ratelimit-requests-limit"
        )
    
        try:
            self.requests_remaining = (
                int(remaining)
                if remaining is not None
                else None
            )
        except (TypeError, ValueError):
            self.requests_remaining = None
    
        try:
            self.requests_limit = (
                int(limit)
                if limit is not None
                else None
            )
        except (TypeError, ValueError):
            self.requests_limit = None
    
        minute_remaining = response.headers.get(
            "X-RateLimit-Remaining"
        )
    
        minute_limit = response.headers.get(
            "X-RateLimit-Limit"
        )
    
        try:
            self.rate_limit_remaining = (
                int(minute_remaining)
                if minute_remaining is not None
                else None
            )
        except (TypeError, ValueError):
            self.rate_limit_remaining = None
    
        try:
            self.rate_limit_limit = (
                int(minute_limit)
                if minute_limit is not None
                else None
            )
        except (TypeError, ValueError):
            self.rate_limit_limit = None
    
        # Persist quota in Redis
        SportsCache.set_provider_quota(
            remaining=self.requests_remaining,
            limit=self.requests_limit,
            minute_remaining=self.rate_limit_remaining,
            minute_limit=self.rate_limit_limit,
        )

    def can_make_request(
      self,
      priority: str = "normal",
  ) -> bool:
  
      quota = SportsCache.get_provider_quota() or {}
  
      remaining = quota.get("remaining")
  
      # First request / quota unknown
      if remaining is None:
          return True
  
      if priority == "critical":
          return remaining > 0
  
      if priority == "live":
          return remaining >= 5
  
      if priority == "essential":
          return remaining >= 10
  
      if priority == "normal":
          return remaining >= 20
  
      if priority == "low":
          return remaining >= 30
  
      return False

    @staticmethod
    def _build_error_message(
        endpoint: str,
        status_code: int,
        data: Any,
    ) -> str:

        if isinstance(data, dict):
            message = (
                data.get("message")
                or data.get("error")
                or data.get("errors")
            )

            if message:
                return (
                    f"Sports provider error "
                    f"{status_code} on {endpoint}: {message}"
                )

        return (
            f"Sports provider error "
            f"{status_code} on {endpoint}"
        )

    def get_competitions(self, **params) -> ProviderResponse:
        raise NotImplementedError

    def get_competition(
        self,
        competition_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_teams(self, **params) -> ProviderResponse:
        raise NotImplementedError

    def get_team(
        self,
        team_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_players(self, **params) -> ProviderResponse:
        raise NotImplementedError

    def get_player(
        self,
        player_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_matches(self, **params) -> ProviderResponse:
        raise NotImplementedError

    def get_match(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_match_events(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_match_lineups(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_match_statistics(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:
        raise NotImplementedError

    def get_standings(self, **params) -> ProviderResponse:
        raise NotImplementedError

class APIFootballProvider(HTTPBasedSportsProvider):

    name = "api-football"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int | None = None,
    ):
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
        )

        if not self.api_key:
            raise SportsProviderConfigurationError(
                "API_FOOTBALL_KEY is not configured."
            )

        self.session.headers.update(
            {
                "x-apisports-key": self.api_key,
            }
        )

    def get_competitions(self, **params) -> ProviderResponse:
        return self._request(
            "/leagues",
            params=params,
        )

    def get_competition(
        self,
        competition_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/leagues",
            params={
                "id": competition_id,
                **params,
            },
        )

    def get_teams(self, **params) -> ProviderResponse:
        return self._request(
            "/teams",
            params=params,
        )

    def get_team(
        self,
        team_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/teams",
            params={
                "id": team_id,
                **params,
            },
        )


    def get_players(self, **params) -> ProviderResponse:
        return self._request(
            "/players",
            params=params,
        )

    def get_player(
        self,
        player_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/players",
            params={
                "id": player_id,
                **params,
            },
        )

    def get_matches(self, **params) -> ProviderResponse:
        return self._request(
            "/fixtures",
            params=params,
        )

    def get_match(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/fixtures",
            params={
                "id": match_id,
                **params,
            },
        )

    def get_match_events(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/fixtures/events",
            params={
                "fixture": match_id,
                **params,
            },
        )

    def get_match_lineups(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/fixtures/lineups",
            params={
                "fixture": match_id,
                **params,
            },
        )

    def get_match_statistics(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:

        return self._request(
            "/fixtures/statistics",
            params={
                "fixture": match_id,
                **params,
            },
        )

    def get_standings(self, **params) -> ProviderResponse:
        return self._request(
            "/standings",
            params=params,
        )
  
    def get_live_matches(self, **params) -> ProviderResponse:
      return self._request(
          "/fixtures",
          params={
              "live": "all",
              **params,
          },
      )

    def get_live_match(
        self,
        match_id: int,
        **params,
    ) -> ProviderResponse:
    
        return self._request(
            "/fixtures",
            params={
                "id": match_id,
                **params,
            },
        )

    def get_matches_by_ids(
        self,
        match_ids: list[int],
        **params,
    ) -> ProviderResponse:
        """
        Retrieve up to 20 fixtures in one API request.
        """
    
        if not match_ids:
            return ProviderResponse(
                data={
                    "response": [],
                    "results": 0,
                },
                status_code=200,
                endpoint="/fixtures",
                params={},
            )
    
        if len(match_ids) > 20:
            raise ValueError(
                "API-Football supports a maximum of "
                "20 fixture IDs per request."
            )
    
        ids = "-".join(
            str(match_id)
            for match_id in match_ids
        )
    
        return self._request(
            "/fixtures",
            params={
                "ids": ids,
                **params,
            },
        )

def get_sports_provider() -> BaseSportsProvider:
    """
    Return the configured sports provider.

    The rest of the application should use this function:

        provider = get_sports_provider()

    rather than directly constructing APIFootballProvider.
    """

    provider_name = getattr(
        settings,
        "SPORTS_PROVIDER",
        "api-football",
    )

    if provider_name == "api-football":

        return APIFootballProvider(
            api_key=getattr(
                settings,
                "API_FOOTBALL_KEY",
                None,
            ),
            base_url=getattr(
                settings,
                "API_FOOTBALL_BASE_URL",
                "https://v3.football.api-sports.io",
            ),
            timeout=getattr(
                settings,
                "SPORTS_PROVIDER_TIMEOUT",
                10,
            ),
        )

    raise SportsProviderConfigurationError(
        f"Unsupported sports provider: {provider_name}"
    )