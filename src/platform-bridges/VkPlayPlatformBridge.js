import PlatformBridgeBase from './PlatformBridgeBase'
import { addJavaScript, waitFor } from '../common/utils'
import {
    PLATFORM_ID,
    REWARDED_STATE,
    INTERSTITIAL_STATE,
    ACTION_NAME,
    ERROR,
} from '../constants'

class VkPlayPlatformBridge extends PlatformBridgeBase {
    // platform
    get platformId() {
        return PLATFORM_ID.VK_PLAY
    }

    // player
    get isPlayerAuthorizationSupported() {
        return true
    }

    // clipboard
    get isClipboardSupported() {
        return false
    }

    #currentAdvertisementIsRewarded = false

    initialize() {
        if (this._isInitialized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            if (!this._options || !this._options.gameId) {
                this._rejectPromiseDecorator(ACTION_NAME.INITIALIZE, ERROR.VK_PLAY_GAME_ID_IS_UNDEFINED)
            } else {
                const { gameId } = this._options
                const options = {
                    appid: gameId,
                    userProfileCallback: (data) => this.#onGetUserProfileCompleted(data),
                    getLoginStatusCallback: (data) => this.#onGetLoginStatusCompleted(data),
                    registerUserCallback: (data) => this.#onRegisterUserCompleted(data),
                    adsCallback: (data) => this.#onShowAdsCompleted(data),
                    getGameInventoryItemsCallback: (data) => this.#onGetGameInventoryItemsCompleted(data),
                    paymentReceivedCallback: (data) => this.#onPaymentReceived(data),
                }

                addJavaScript(`https://vkplay.ru/app/${gameId}/static/mailru.core.js`)
                    .then(() => {
                        waitFor('iframeApi')
                            .then(() => {
                                window.iframeApi(options)
                                    .then((sdk) => {
                                        this._platformSdk = sdk
                                        this._platformSdk.getLoginStatus()
                                    })
                            })
                    })
            }
        }

        return promiseDecorator.promise
    }

    // advertisement
    showInterstitial() {
        this.#currentAdvertisementIsRewarded = false
        this._platformSdk.showAds({ interstitial: true })
            .then(() => {
                this._setInterstitialState(INTERSTITIAL_STATE.OPENED)
            })
            .catch(() => {
                this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
            })
    }

    showRewarded() {
        this.#currentAdvertisementIsRewarded = true
        this._platformSdk.showAds({ interstitial: false })
            .then(() => {
                this._setRewardedState(REWARDED_STATE.OPENED)
            })
            .catch(() => {
                this._setRewardedState(REWARDED_STATE.FAILED)
            })
    }

    // player
    authorizePlayer() {
        if (this._isPlayerAuthorized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
            this._platformSdk.registerUser()
        }

        return promiseDecorator
    }

    // payments
    getPaymentsCatalog() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.GET_CATALOG)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.GET_CATALOG)
            this._platformSdk.getGameInventoryItems()
        }

        return promiseDecorator.promise
    }

    purchase(options) {
        if (!options) {
            return Promise.reject()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.PURCHASE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.PURCHASE)
            this._platformSdk.paymentFrameItem(options)
        }

        return promiseDecorator.promise
    }

    #onShowAdsCompleted(data) {
        const isFailed = data.code && data.code === 'AdsNotFound'
        switch (data.type) {
            case 'adCompleted':
                if (this.#currentAdvertisementIsRewarded) {
                    this._setRewardedState(REWARDED_STATE.REWARDED)
                    this._setRewardedState(REWARDED_STATE.CLOSED)
                } else {
                    this._setInterstitialState(INTERSTITIAL_STATE.CLOSED)
                }
                break
            case 'adError':
                if (this.#currentAdvertisementIsRewarded) {
                    this._setRewardedState(REWARDED_STATE.FAILED)
                } else {
                    this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
                }
                break
            case 'adDismissed':
                if (this.#currentAdvertisementIsRewarded) {
                    this._setRewardedState(isFailed ? REWARDED_STATE.FAILED : REWARDED_STATE.CLOSED)
                } else {
                    this._setInterstitialState(isFailed ? INTERSTITIAL_STATE.FAILED : INTERSTITIAL_STATE.CLOSED)
                }
                break
            default:
                break
        }
    }

    #onGetLoginStatusCompleted(data) {
        if (data && data.status === 'ok') {
            this._isPlayerAuthorized = data.loginStatus === 2 || data.loginStatus === 3
        }

        if (this._isPlayerAuthorized) {
            this._platformSdk.userProfile()
        } else {
            this._isInitialized = true
            this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
        }
    }

    #onGetUserProfileCompleted(data) {
        if (data.status === 'ok') {
            this._playerId = data.uid
            this._playerName = data.nick
            this._playerPhotos = [data.avatar]
        }

        this._isInitialized = true
        this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
    }

    #onRegisterUserCompleted(data) {
        if (data.status === 'ok') {
            this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
            this._platformSdk.reloadWindow()
        } else {
            this._rejectPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER, data.errmsg)
        }
    }

    #onGetGameInventoryItemsCompleted(data) {
        if (data?.length === 0) {
            this._rejectPromiseDecorator(ACTION_NAME.GET_CATALOG)
            return
        }

        this._resolvePromiseDecorator(ACTION_NAME.GET_CATALOG, data)
    }

    #onPaymentReceived(data) {
        if (data && data.uid) {
            this._resolvePromiseDecorator(ACTION_NAME.PURCHASE, data.uid)
            return
        }

        this._rejectPromiseDecorator(ACTION_NAME.PURCHASE)
    }
}

export default VkPlayPlatformBridge
