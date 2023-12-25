import EventLite from 'event-lite'
import Timer, { STATE as TIMER_STATE } from '../common/Timer'
import ModuleBase from './ModuleBase'
import {
    EVENT_NAME, INTERSTITIAL_STATE, REWARDED_STATE, BANNER_STATE,
} from '../constants'

class AdvertisementModule extends ModuleBase {
    get isBannerSupported() {
        return this._platformBridge.isBannerSupported
    }

    get bannerState() {
        return this._platformBridge.bannerState
    }

    get interstitialState() {
        return this._platformBridge.interstitialState
    }

    get rewardedState() {
        return this._platformBridge.rewardedState
    }

    get minimumDelayBetweenInterstitial() {
        return this.#minimumDelayBetweenInterstitial
    }

    #interstitialTimer

    #minimumDelayBetweenInterstitial = 60

    constructor(platformBridge) {
        super(platformBridge)

        this._platformBridge.on(
            EVENT_NAME.INTERSTITIAL_STATE_CHANGED,
            (state) => {
                if (state === INTERSTITIAL_STATE.CLOSED) {
                    if (this.#minimumDelayBetweenInterstitial > 0) {
                        this.#startInterstitialTimer()
                    }
                }

                this.emit(EVENT_NAME.INTERSTITIAL_STATE_CHANGED, state)
            },
        )

        this._platformBridge.on(
            EVENT_NAME.REWARDED_STATE_CHANGED,
            (state) => this.emit(EVENT_NAME.REWARDED_STATE_CHANGED, state),
        )

        this._platformBridge.on(
            EVENT_NAME.BANNER_STATE_CHANGED,
            (state) => this.emit(EVENT_NAME.BANNER_STATE_CHANGED, state),
        )
    }

    setMinimumDelayBetweenInterstitial(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (typeof platformDependedOptions !== 'undefined') {
                this.setMinimumDelayBetweenInterstitial(platformDependedOptions)
                return
            }
        }

        const optionsType = typeof options
        let delay = this.#minimumDelayBetweenInterstitial

        switch (optionsType) {
            case 'number': {
                delay = options
                break
            }
            case 'string': {
                delay = parseInt(options, 10)
                if (Number.isNaN(delay)) {
                    return
                }
                break
            }
            default: {
                return
            }
        }

        this.#minimumDelayBetweenInterstitial = delay

        if (this.#interstitialTimer) {
            this.#interstitialTimer.stop()
            this.#startInterstitialTimer()
        }
    }

    showBanner(options) {
        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                this.showBanner(platformDependedOptions)
                return
            }
        }

        if (this.bannerState === BANNER_STATE.LOADING || this.bannerState === BANNER_STATE.SHOWN) {
            return
        }

        this._platformBridge._setBannerState(BANNER_STATE.LOADING)
        if (!this.isBannerSupported) {
            this._platformBridge._setBannerState(BANNER_STATE.FAILED)
            return
        }

        this._platformBridge.showBanner(options)
    }

    hideBanner() {
        if (this.bannerState === BANNER_STATE.LOADING || this.bannerState === BANNER_STATE.HIDDEN) {
            return
        }

        if (!this.isBannerSupported) {
            return
        }

        this._platformBridge.hideBanner()
    }

    showInterstitial(options) {
        if (this.#hasAdvertisementInProgress()) {
            return
        }

        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                this.showInterstitial(platformDependedOptions)
                return
            }
        }

        let ignoreDelay = false
        if (options && typeof options.ignoreDelay === 'boolean') {
            ignoreDelay = options.ignoreDelay
        }

        this._platformBridge._setInterstitialState(INTERSTITIAL_STATE.LOADING)

        if (this.#interstitialTimer && this.#interstitialTimer.state !== TIMER_STATE.COMPLETED && !ignoreDelay) {
            this._platformBridge._setInterstitialState(INTERSTITIAL_STATE.FAILED)
            return
        }

        this._platformBridge.showInterstitial(options)
    }

    showRewarded(options) {
        if (this.#hasAdvertisementInProgress()) {
            return
        }

        if (options) {
            const platformDependedOptions = options[this._platformBridge.platformId]
            if (platformDependedOptions) {
                this.showRewarded(platformDependedOptions)
                return
            }
        }

        this._platformBridge._setRewardedState(REWARDED_STATE.LOADING)
        this._platformBridge.showRewarded(options)
    }

    #startInterstitialTimer() {
        this.#interstitialTimer = new Timer(this.#minimumDelayBetweenInterstitial)
        this.#interstitialTimer.start()
    }

    #hasAdvertisementInProgress() {
        if (
            this.interstitialState === INTERSTITIAL_STATE.LOADING
            || this.interstitialState === INTERSTITIAL_STATE.OPENED
        ) {
            return true
        }

        if ([
            REWARDED_STATE.LOADING,
            REWARDED_STATE.OPENED,
            REWARDED_STATE.REWARDED,
        ].includes(this.rewardedState)) {
            return true
        }

        return false
    }
}

EventLite.mixin(AdvertisementModule.prototype)
export default AdvertisementModule
