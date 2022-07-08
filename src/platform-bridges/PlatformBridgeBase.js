import EventLite from 'event-lite'
import { PLATFORM_ID, EVENT_NAME, INTERSTITIAL_STATE, REWARDED_STATE } from '../constants'
import PromiseDecorator from '../common/PromiseDecorator'

export const ACTION_NAME = {
    INITIALIZE: 'initialize',
    AUTHORIZE_PLAYER: 'authorize_player',
    SHOW_INTERSTITIAL: 'show_interstitial',
    SHOW_REWARDED: 'show_rewarded',
    SHARE: 'share',
    INVITE_FRIENDS: 'invite_friends',
    JOIN_COMMUNITY: 'join_community',
    CREATE_POST: 'create_post',
    ADD_TO_HOME_SCREEN: 'add_to_home_screen',
    ADD_TO_FAVORITES: 'add_to_favorites',
    RATE: 'rate',
    SET_LEADERBOARD_SCORE: 'set_leaderboard_score',
    GET_LEADERBOARD_SCORE: 'get_leaderboard_score',
    GET_LEADERBOARD_ENTRIES: 'get_leaderboard_entries',
    SHOW_LEADERBOARD_NATIVE_POPUP: 'show_leaderboard_native_popup'
}

class PlatformBridgeBase {

    // platform
    get platformId() {
        return PLATFORM_ID.MOCK
    }

    get platformSdk() {
        return this._platformSdk
    }

    get platformLanguage() {
        let value = navigator.language
        if (typeof value === 'string')
            return value.substring(0, 2)

        return 'en'
    }

    get platformPayload() {
        let url = new URL(window.location.href)
        return url.searchParams.get('payload')
    }

    get referrer() {
        return "no referrer"
    }

    // player
    get isPlayerAuthorizationSupported() {
        return false
    }

    get isPlayerAuthorized() {
        return this._isPlayerAuthorized
    }

    get playerId() {
        return this._playerId
    }

    get playerName() {
        return this._playerName
    }

    get playerPhotos() {
        return this._playerPhotos
    }


    // advertisement
    get interstitialState() {
        return this._interstitialState
    }

    get rewardedState() {
        return this._rewardedState
    }


    // social
    get isInviteFriendsSupported() {
        return false
    }

    get isJoinCommunitySupported() {
        return false
    }

    get isShareSupported() {
        return false
    }

    get isCreatePostSupported() {
        return false
    }

    get isAddToHomeScreenSupported() {
        return false
    }

    get isAddToFavoritesSupported() {
        return false
    }

    get isRateSupported() {
        return false
    }


    // device
    get deviceType() {
        if (navigator && navigator.userAgent) {
            let userAgent = navigator.userAgent.toLowerCase()
            if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent))
                return 'mobile'

            if (/ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP)))/.test(userAgent))
                return 'tablet'
        }

        return 'desktop'
    }


    // leaderboard
    get isLeaderboardSupported() {
        return false
    }

    get isLeaderboardNativePopupSupported() {
        return false
    }

    get isLeaderboardMultipleBoardsSupported() {
        return false
    }

    get isLeaderboardSetScoreSupported() {
        return false
    }

    get isLeaderboardGetScoreSupported() {
        return false
    }

    get isLeaderboardGetEntriesSupported() {
        return false
    }

    //payments
    get isPaymentsSupported() {
        return false
    }


    LOCAL_STORAGE_GAME_DATA_KEY = 'game_data'

    _isInitialized = false
    _platformSdk = null
    _localStorage = null
    _isPlayerAuthorized = false
    _playerId = null
    _playerName = null
    _playerPhotos = []
    _gameData = null
    _interstitialState = null
    _rewardedState = null

    #promiseDecorators = { }


    constructor(options) {
        if (options)
            this._options = { ...options }

        try {
            this._localStorage = window.localStorage
        }
        catch (e) { }
    }

    initialize() {
        return Promise.resolve()
    }


    // player
    authorizePlayer(options) {
        return Promise.reject()
    }


    // game
    getGameData(key) {
        return new Promise(resolve => {
            this._loadGameDataFromLocalStorage()
                .finally(() => {
                    if (!this._gameData) {
                        resolve(null)
                        return
                    }

                    let data = this._gameData[key]
                    if (typeof data !== 'undefined')
                        resolve(data)
                    else
                        resolve(null)
                })
        })
    }

    setGameData(key, value) {
        if (!this._gameData)
            this._gameData = { }

        this._gameData[key] = value
        return this._saveGameDataToLocalStorage()
    }

    deleteGameData(key) {
        if (this._gameData) {
            delete this._gameData[key]
            return this._saveGameDataToLocalStorage()
        }

        return Promise.resolve()
    }


    // advertisement
    showInterstitial() {
        return Promise.reject()
    }

    showRewarded() {
        return Promise.reject()
    }


    // social
    inviteFriends() {
        return Promise.reject()
    }

    joinCommunity() {
        return Promise.reject()
    }

    share() {
        return Promise.reject()
    }

    createPost(message) {
        return Promise.reject()
    }

    addToHomeScreen() {
        return Promise.reject()
    }

    addToFavorites() {
        return Promise.reject()
    }

    rate() {
        return Promise.reject()
    }


    // leaderboard
    setLeaderboardScore(options) {
        return Promise.reject()
    }

    getLeaderboardScore(options) {
        return Promise.reject()
    }

    getLeaderboardEntries(options) {
        return Promise.reject()
    }

    showLeaderboardNativePopup(options) {
        return Promise.reject()
    }


    //payments
    showOrderPayments(title) {
        return Promise.reject()
    }


    _loadGameDataFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                let json = this._localStorage.getItem(this.LOCAL_STORAGE_GAME_DATA_KEY)
                if (json)
                    this._gameData = JSON.parse(json)

                resolve()
            }
            catch (e) {
                reject(e)
            }
        })
    }

    _saveGameDataToLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                this._localStorage.setItem(this.LOCAL_STORAGE_GAME_DATA_KEY, JSON.stringify(this._gameData))
                resolve()
            }
            catch (e) {
                reject(e)
            }
        })
    }


    _setInterstitialState(state) {
        if (this._interstitialState === state && state !== INTERSTITIAL_STATE.FAILED)
            return

        this._interstitialState = state
        this.emit(EVENT_NAME.INTERSTITIAL_STATE_CHANGED, this._interstitialState)
    }

    _setRewardedState(state) {
        if (this._rewardedState === state && state !== REWARDED_STATE.FAILED)
            return

        this._rewardedState = state
        this.emit(EVENT_NAME.REWARDED_STATE_CHANGED, this._rewardedState)
    }

    _canShowAdvertisement() {
        if (this._interstitialState) {
            if (this._interstitialState !== INTERSTITIAL_STATE.CLOSED && this._interstitialState !== INTERSTITIAL_STATE.FAILED)
                return false
        }

        if (this._rewardedState) {
            if (this._rewardedState !== REWARDED_STATE.CLOSED && this._rewardedState !== REWARDED_STATE.FAILED)
                return false
        }

        return true
    }

    _createPromiseDecorator(actionName) {
        let promiseDecorator = new PromiseDecorator()
        this.#promiseDecorators[actionName] = promiseDecorator
        return promiseDecorator
    }

    _getPromiseDecorator(actionName) {
        return this.#promiseDecorators[actionName]
    }

    _resolvePromiseDecorator(id, data) {
        if (this.#promiseDecorators[id]) {
            this.#promiseDecorators[id].resolve(data)
            delete this.#promiseDecorators[id]
        }
    }

    _rejectPromiseDecorator(id, error) {
        if (this.#promiseDecorators[id]) {
            this.#promiseDecorators[id].reject(error)
            delete this.#promiseDecorators[id]
        }
    }
}

EventLite.mixin(PlatformBridgeBase.prototype)
export default PlatformBridgeBase