import {
    PLATFORM_ID,
    MODULE_NAME,
    EVENT_NAME,
    INTERSTITIAL_STATE,
    REWARDED_STATE,
    BANNER_STATE,
    STORAGE_TYPE,
    VISIBILITY_STATE,
    DEVICE_TYPE,
    PLATFORM_MESSAGE,
    ERROR,
} from './constants'
import PromiseDecorator from './common/PromiseDecorator'
import PlatformBridgeBase from './platform-bridges/PlatformBridgeBase'
import VkPlatformBridge from './platform-bridges/VkPlatformBridge'
import YandexPlatformBridge from './platform-bridges/YandexPlatformBridge'
import PlatformModule from './modules/PlatformModule'
import PlayerModule from './modules/PlayerModule'
import GameModule from './modules/GameModule'
import StorageModule from './modules/StorageModule'
import AdvertisementModule from './modules/AdvertisementModule'
import SocialModule from './modules/SocialModule'
import DeviceModule from './modules/DeviceModule'
import LeaderboardModule from './modules/LeaderboardModule'
import PaymentsModule from './modules/PaymentsModule'
import CrazyGamesPlatformBridge from './platform-bridges/CrazyGamesPlatformBridge'
import AbsoluteGamesPlatformBridge from './platform-bridges/AbsoluteGamesPlatformBridge'
import GameDistributionPlatformBridge from './platform-bridges/GameDistributionPlatformBridge'
import VkPlayPlatformBridge from './platform-bridges/VkPlayPlatformBridge'

class InstantGamesBridge {
    get version() {
        return '1.9.2'
    }

    get isInitialized() {
        return this.#isInitialized
    }

    get platform() {
        return this.#getModule(MODULE_NAME.PLATFORM)
    }

    get player() {
        return this.#getModule(MODULE_NAME.PLAYER)
    }

    get game() {
        return this.#getModule(MODULE_NAME.GAME)
    }

    get storage() {
        return this.#getModule(MODULE_NAME.STORAGE)
    }

    get advertisement() {
        return this.#getModule(MODULE_NAME.ADVERTISEMENT)
    }

    get social() {
        return this.#getModule(MODULE_NAME.SOCIAL)
    }

    get device() {
        return this.#getModule(MODULE_NAME.DEVICE)
    }

    get leaderboard() {
        return this.#getModule(MODULE_NAME.LEADERBOARD)
    }

    get payments() {
        return this.#getModule(MODULE_NAME.PAYMENTS)
    }

    get PLATFORM_ID() {
        return PLATFORM_ID
    }

    get PLATFORM_MESSAGE() {
        return PLATFORM_MESSAGE
    }

    get MODULE_NAME() {
        return MODULE_NAME
    }

    get EVENT_NAME() {
        return EVENT_NAME
    }

    get INTERSTITIAL_STATE() {
        return INTERSTITIAL_STATE
    }

    get REWARDED_STATE() {
        return REWARDED_STATE
    }

    get BANNER_STATE() {
        return BANNER_STATE
    }

    get STORAGE_TYPE() {
        return STORAGE_TYPE
    }

    get VISIBILITY_STATE() {
        return VISIBILITY_STATE
    }

    get DEVICE_TYPE() {
        return DEVICE_TYPE
    }

    #isInitialized = false

    #initializationPromiseDecorator = null

    #platformBridge = null

    #modules = {}

    #overriddenModules = {}

    initialize(options) {
        if (this.#isInitialized) {
            return Promise.resolve()
        }

        if (!this.#initializationPromiseDecorator) {
            this.#initializationPromiseDecorator = new PromiseDecorator()
            this._options = { ...options }
            this.#createPlatformBridge()
            this.#platformBridge
                .initialize()
                .then(() => {
                    this.#modules[MODULE_NAME.PLATFORM] = new PlatformModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.PLAYER] = new PlayerModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.GAME] = new GameModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.STORAGE] = new StorageModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.ADVERTISEMENT] = new AdvertisementModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.SOCIAL] = new SocialModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.DEVICE] = new DeviceModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.LEADERBOARD] = new LeaderboardModule(this.#platformBridge)
                    this.#modules[MODULE_NAME.PAYMENTS] = new PaymentsModule(this.#platformBridge)

                    this.#isInitialized = true
                    console.info(`%c InstantGamesBridge v.${this.version} initialized. `, 'background: #01A5DA; color: white')

                    if (this.#initializationPromiseDecorator) {
                        this.#initializationPromiseDecorator.resolve()
                        this.#initializationPromiseDecorator = null
                    }
                })
        }

        return this.#initializationPromiseDecorator.promise
    }

    overrideModule(id, value) {
        if (typeof value !== 'object') {
            return
        }

        this.#overriddenModules[id] = value
        if (typeof value.initialize === 'function') {
            value.initialize(module)
        }
    }

    #createPlatformBridge() {
        let platformId = PLATFORM_ID.MOCK

        if (this._options && this._options.forciblySetPlatformId) {
            switch (this._options.forciblySetPlatformId) {
                case PLATFORM_ID.VK: {
                    platformId = PLATFORM_ID.VK
                    break
                }
                case PLATFORM_ID.YANDEX: {
                    platformId = PLATFORM_ID.YANDEX
                    break
                }
                case PLATFORM_ID.CRAZY_GAMES: {
                    platformId = PLATFORM_ID.CRAZY_GAMES
                    break
                }
                case PLATFORM_ID.ABSOLUTE_GAMES: {
                    platformId = PLATFORM_ID.ABSOLUTE_GAMES
                    break
                }
                case PLATFORM_ID.GAME_DISTRIBUTION: {
                    platformId = PLATFORM_ID.GAME_DISTRIBUTION
                    break
                }
                default: {
                    platformId = PLATFORM_ID.MOCK
                    break
                }
            }
        } else {
            const url = new URL(window.location.href)

            const yandexUrl = ['y', 'a', 'n', 'd', 'e', 'x', '.', 'n', 'e', 't'].join('')
            if (url.hostname.includes(yandexUrl) || url.hash.includes('yandex')) {
                platformId = PLATFORM_ID.YANDEX
            } else if (url.hostname.includes('crazygames.') || url.hostname.includes('1001juegos.com')) {
                platformId = PLATFORM_ID.CRAZY_GAMES
            } else if (url.hostname.includes('gamedistribution.com')) {
                platformId = PLATFORM_ID.GAME_DISTRIBUTION
            } else if (url.searchParams.has('api_id') && url.searchParams.has('viewer_id') && url.searchParams.has('auth_key')) {
                platformId = PLATFORM_ID.VK
            } else if (url.searchParams.has('app_id') && url.searchParams.has('player_id') && url.searchParams.has('game_sid') && url.searchParams.has('auth_key')) {
                platformId = PLATFORM_ID.ABSOLUTE_GAMES
            } else if (url.hostname.includes('s3.eponesh.')) {
                platformId = PLATFORM_ID.VK_PLAY
            }
        }
        switch (platformId) {
            case PLATFORM_ID.VK: {
                this.#platformBridge = new VkPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.VK],
                )
                break
            }
            case PLATFORM_ID.YANDEX: {
                this.#platformBridge = new YandexPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.YANDEX],
                )
                break
            }
            case PLATFORM_ID.CRAZY_GAMES: {
                this.#platformBridge = new CrazyGamesPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.CRAZY_GAMES],
                )
                break
            }
            case PLATFORM_ID.ABSOLUTE_GAMES: {
                this.#platformBridge = new AbsoluteGamesPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.ABSOLUTE_GAMES],
                )
                break
            }
            case PLATFORM_ID.GAME_DISTRIBUTION: {
                this.#platformBridge = new GameDistributionPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.GAME_DISTRIBUTION],
                )
                break
            }
            case PLATFORM_ID.VK_PLAY: {
                this.#platformBridge = new VkPlayPlatformBridge(
                    this._options && this._options.platforms && this._options.platforms[PLATFORM_ID.VK_PLAY],
                )
                break
            }
            default: {
                this.#platformBridge = new PlatformBridgeBase()
                break
            }
        }
    }

    #getModule(id) {
        if (!this.#isInitialized) {
            console.error(ERROR.SDK_NOT_INITIALIZED)
        }

        if (this.#overriddenModules[id]) {
            return this.#overriddenModules[id]
        }

        return this.#modules[id]
    }
}

export default InstantGamesBridge
