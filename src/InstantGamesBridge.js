import { PLATFORM_ID, MODULE_NAME, EVENT_NAME, INTERSTITIAL_STATE, REWARDED_STATE, STORAGE_TYPE, VISIBILITY_STATE } from './constants'
import PromiseDecorator from './common/PromiseDecorator'
import PlatformBridgeBase from './platform-bridges/PlatformBridgeBase'
import VkPlatformBridge from './platform-bridges/VkPlatformBridge'
import YandexPlatformBridge from './platform-bridges/YandexPlatformBridge'
import TggPlatformBridge from './platform-bridges/TggPlatformBridge'
import PlatformModule from './modules/PlatformModule'
import PlayerModule from './modules/PlayerModule'
import GameModule from './modules/GameModule'
import StorageModule from './modules/StorageModule'
import AdvertisementModule from './modules/AdvertisementModule'
import SocialModule from './modules/SocialModule'
import DeviceModule from './modules/DeviceModule'
import LeaderboardModule from './modules/LeaderboardModule'

class InstantGamesBridge {

    get version() {
        return '1.5.1'
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

    get PLATFORM_ID() {
        return PLATFORM_ID
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

    get STORAGE_TYPE() {
        return STORAGE_TYPE
    }

    get VISIBILITY_STATE() {
        return VISIBILITY_STATE
    }

    #isInitialized = false
    #initializationPromiseDecorator = null

    #platformBridge = null
    #modules = { }
    #overriddenModules = { }

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

                    this.#isInitialized = true
                    console.log('%c InstantGamesBridge v.' + this.version + ' initialized. ', 'background: #01A5DA; color: white')

                    if (this.#initializationPromiseDecorator) {
                        this.#initializationPromiseDecorator.resolve()
                        this.#initializationPromiseDecorator = null
                    }
                })
        }

        return this.#initializationPromiseDecorator.promise
    }

    overrideModule(id, value) {
        if (!this.#isInitialized) {
            return
        }

        let module = this.#modules[id]
        if (module) {
            this.#overriddenModules[id] = value

            if (typeof value.initialize === 'function') {
                value.initialize(module)
            }
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
                case PLATFORM_ID.TGG: {
                    platformId = PLATFORM_ID.TGG
                    break
                }
            }
        } else {
            let url = new URL(window.location.href)
            let yandexUrl = ['y', 'a', 'n', 'd', 'e', 'x', '.', 'n', 'e', 't'].join('')
            if (url.hostname.includes(yandexUrl) || url.hash.includes('yandex')) {
                platformId = PLATFORM_ID.YANDEX
            } else if (url.searchParams.has('api_id') && url.searchParams.has('viewer_id') && url.searchParams.has('auth_key')) {
                platformId = PLATFORM_ID.VK
            } else if (url.searchParams.has('platform')) {
                switch (url.searchParams.get('platform')) {
                    case PLATFORM_ID.TGG: {
                        platformId = PLATFORM_ID.TGG
                        break
                    }
                }
            }
        }

        switch (platformId) {
            case PLATFORM_ID.VK: {
                this.#platformBridge = new VkPlatformBridge(this._options && this._options.platforms && this._options.platforms.vk)
                break
            }
            case PLATFORM_ID.YANDEX: {
                this.#platformBridge = new YandexPlatformBridge(this._options && this._options.platforms && this._options.platforms.yandex)
                break
            }
            case PLATFORM_ID.TGG: {
                this.#platformBridge = new TggPlatformBridge(this._options && this._options.platforms && this._options.platforms.tgg)
                break
            }
            case PLATFORM_ID.MOCK: {
                this.#platformBridge = new PlatformBridgeBase()
                break
            }
        }
    }

    #getModule(id) {
        if (this.#overriddenModules[id]) {
            return this.#overriddenModules[id]
        }

        return this.#modules[id]
    }

}

export default InstantGamesBridge