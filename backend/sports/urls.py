from django.urls import path

from .views import (
    # Matches
    TodayMatchesView,
    LiveMatchesView,
    MatchDetailView,
    MatchEventsView,
    MatchStatisticsView,
    MatchLineupsView,

    # Fixtures / Results
    FixturesView,
    ResultsView,

    # Competitions
    CompetitionListView,
    CompetitionDetailView,
    CompetitionStandingsView,

    # Teams
    TeamListView,
    TeamDetailView,
    TeamMatchesView,

    # Players
    PlayerListView,
    PlayerDetailView,
)


app_name = "sports"


urlpatterns = [

    # =========================================================
    # MATCHES
    # =========================================================

    path(
        "matches/today/",
        TodayMatchesView.as_view(),
        name="today-matches",
    ),

    path(
        "matches/live/",
        LiveMatchesView.as_view(),
        name="live-matches",
    ),

    path(
        "matches/<int:match_id>/",
        MatchDetailView.as_view(),
        name="match-detail",
    ),

    path(
        "matches/<int:match_id>/events/",
        MatchEventsView.as_view(),
        name="match-events",
    ),

    path(
        "matches/<int:match_id>/stats/",
        MatchStatisticsView.as_view(),
        name="match-statistics",
    ),

    path(
        "matches/<int:match_id>/lineups/",
        MatchLineupsView.as_view(),
        name="match-lineups",
    ),


    # =========================================================
    # FIXTURES
    # =========================================================

    path(
        "fixtures/",
        FixturesView.as_view(),
        name="fixtures",
    ),


    # =========================================================
    # RESULTS
    # =========================================================

    path(
        "results/",
        ResultsView.as_view(),
        name="results",
    ),


    # =========================================================
    # COMPETITIONS
    # =========================================================

    path(
        "competitions/",
        CompetitionListView.as_view(),
        name="competition-list",
    ),

    path(
        "competitions/<int:competition_id>/",
        CompetitionDetailView.as_view(),
        name="competition-detail",
    ),

    path(
        "competitions/<int:competition_id>/standings/",
        CompetitionStandingsView.as_view(),
        name="competition-standings",
    ),


    # =========================================================
    # TEAMS
    # =========================================================

    path(
        "teams/",
        TeamListView.as_view(),
        name="team-list",
    ),

    path(
        "teams/<int:team_id>/",
        TeamDetailView.as_view(),
        name="team-detail",
    ),

    path(
        "teams/<int:team_id>/matches/",
        TeamMatchesView.as_view(),
        name="team-matches",
    ),


    # =========================================================
    # PLAYERS
    # =========================================================

    path(
        "players/",
        PlayerListView.as_view(),
        name="player-list",
    ),

    path(
        "players/<int:player_id>/",
        PlayerDetailView.as_view(),
        name="player-detail",
    ),
]