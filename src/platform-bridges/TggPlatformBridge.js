import PlatformBridgeBase, { ACTION_NAME } from './PlatformBridgeBase'
import { PLATFORM_ID } from '../constants'
import { addJavaScript } from '../common/utils'

const TGG_SDK_URL = 'https://storage.yandexcloud.net/tgg-sdk/v1.2.0/tggsdk.js'

class TggPlatformBridge extends PlatformBridgeBase {

    // platform
    get platformId() {
        return PLATFORM_ID.TGG
    }

    get platformLanguage() {
        return 'en'
    }

    get referrer() {
        return "no referrer"
    }

    // player
    get isPlayerAuthorizationSupported() {
        return true
    }

    get isPlayerAuthorized() {
        return true
    }


    initialize() {
        if (this._isInitialized)
            return Promise.resolve()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            addJavaScript(TGG_SDK_URL).then(() => {
                this._platformSdk = window.tggsdk
                this._platformSdk.initialize()
                    .then(() => {
                        this._platformSdk.player.getData()
                            .then(playerData => {
                                this._playerId = playerData.id
                                this._playerName = playerData.name
                            })
                            .finally(() => {
                                this._isInitialized = true
                                this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
                            })
                    })
                    .catch(error => this._rejectPromiseDecorator(ACTION_NAME.INITIALIZE, error))
            })
        }

        return promiseDecorator.promise
    }


    // player
    authorizePlayer(options) {
        return Promise.resolve()
    }


    // game
    getGameData(key) {
        return new Promise((resolve, reject) => {
            if (this._gameData) {
                if (typeof this._gameData[key] === 'undefined')
                    resolve(null)
                else
                    resolve(this._gameData[key])

                return
            }

            this._platformSdk.game.getData()
                .then(loadedData => {
                    this._gameData = loadedData
                    if (typeof this._gameData[key] === 'undefined')
                        resolve(null)
                    else
                        resolve(this._gameData[key])
                })
                .catch(error => {
                    reject(error)
                })
        })
    }

    setGameData(key, value) {
        if (!this._gameData)
            this._gameData = { }

        this._gameData[key] = value
        return this._platformSdk.game.setData(this._gameData)
    }

    deleteGameData(key) {
        if (this._gameData && typeof this._gameData[key] !== 'undefined') {
            delete this._gameData[key]
            return this._platformSdk.game.setData(this._gameData)
        }

        return Promise.resolve()
    }

}

export default TggPlatformBridge