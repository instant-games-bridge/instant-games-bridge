import PlatformBridgeBase, { ACTION_NAME } from './PlatformBridgeBase'
import { addJavaScript } from '../common/utils'
import { PLATFORM_ID, INTERSTITIAL_STATE, REWARDED_STATE } from '../constants'

const YANDEX_SDK_URL = 'https://yandex.ru/games/sdk/v2'

class YandexPlatformBridge extends PlatformBridgeBase {

    // platform
    get platformId() {
        return PLATFORM_ID.YANDEX
    }

    get platformLanguage() {
        if (this._platformSdk)
            return this._platformSdk.environment.i18n.lang

        return super.platformLanguage
    }

    get deviceType() {
        if (this._platformSdk)
            return this._platformSdk.deviceInfo.type

        return super.deviceType
    }

    get referrer() {
        return "no referrer"
    }


    // player
    get isPlayerAuthorizationSupported() {
        return true
    }


    // social
    get isAddToHomeScreenSupported() {
        return this.#isAddToHomeScreenSupported
    }

    get isRateSupported() {
        return true
    }


    // leaderboard
    get isLeaderboardSupported() {
        return true
    }

    get isLeaderboardMultipleBoardsSupported() {
        return true
    }

    get isLeaderboardSetScoreSupported() {
        return true
    }

    get isLeaderboardGetScoreSupported() {
        return true
    }

    get isLeaderboardGetEntriesSupported() {
        return true
    }


    #isAddToHomeScreenSupported = false
    #yandexPlayer = null
    #leaderboards


    initialize() {
        if (this._isInitialized)
            return Promise.resolve()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            addJavaScript(YANDEX_SDK_URL)
                .then(() => {
                    window.YaGames
                        .init()
                        .then(sdk => {
                            this._platformSdk = sdk

                            let getPlayerPromise = this.#getPlayer()
                            let getSafeStoragePromise = this._platformSdk.getStorage()
                                .then(safeStorage => {
                                    this._localStorage = safeStorage
                                })

                            let checkAddToHomeScreenSupportedPromise = this._platformSdk.shortcut.canShowPrompt()
                                .then(prompt => {
                                    this.#isAddToHomeScreenSupported = prompt.canShow
                                })

                            let getLeaderboardsPromise = this._platformSdk.getLeaderboards()
                                .then(leaderboards => {
                                    this.#leaderboards = leaderboards
                                })

                            Promise
                                .all([getPlayerPromise, getSafeStoragePromise, checkAddToHomeScreenSupportedPromise, getLeaderboardsPromise])
                                .finally(() => {
                                    this._isInitialized = true
                                    this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
                                })
                        })
                })
        }

        return promiseDecorator.promise
    }


    // player
    authorizePlayer(options) {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)

            if (this._isPlayerAuthorized) {
                this.#getPlayer(options).then(() => {
                    this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
                })
            } else {
                this._platformSdk.auth.openAuthDialog()
                    .then(() => {
                        this.#getPlayer(options).then(() => {
                            this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
                        })
                    })
                    .catch(error => {
                        this._rejectPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER, error)
                    })
            }
        }

        return promiseDecorator.promise
    }


    // game
    getGameData(key) {
        return new Promise(resolve => {
            if (this._gameData) {
                if (typeof this._gameData[key] === 'undefined')
                    resolve(null)
                else
                    resolve(this._gameData[key])

                return
            }

            if (this.#yandexPlayer) {
                this.#yandexPlayer.getData()
                    .then(loadedData => {
                        this._gameData = loadedData
                        if (typeof this._gameData[key] === 'undefined')
                            resolve(null)
                        else
                            resolve(this._gameData[key])
                    })
                    .catch(() => {
                        resolve(null)
                    })

                return
            }

            super.getGameData(key)
                .then(data => resolve(data))
                .catch(() => resolve(null))
        })
    }

    setGameData(key, value) {
        if (!this._gameData)
            this._gameData = { }

        this._gameData[key] = value
        return this.#saveGameData()
    }

    deleteGameData(key) {
        if (this._gameData) {
            delete this._gameData[key]
            return this.#saveGameData()
        }

        return Promise.resolve()
    }


    // advertisement
    showInterstitial() {
        if (!this._canShowAdvertisement())
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.SHOW_INTERSTITIAL)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.SHOW_INTERSTITIAL)

            this._platformSdk.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        this._resolvePromiseDecorator(ACTION_NAME.SHOW_INTERSTITIAL)
                        this._setInterstitialState(INTERSTITIAL_STATE.OPENED)
                    },
                    onClose: wasShown => {
                        if (wasShown) {
                            this._setInterstitialState(INTERSTITIAL_STATE.CLOSED)
                        } else {
                            this._rejectPromiseDecorator(ACTION_NAME.SHOW_INTERSTITIAL)
                            this._setInterstitialState(INTERSTITIAL_STATE.FAILED)
                        }
                    }
                }
            })
        }

        return promiseDecorator.promise
    }

    showRewarded() {
        if (!this._canShowAdvertisement())
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.SHOW_REWARDED)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.SHOW_REWARDED)

            this._platformSdk.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        this._resolvePromiseDecorator(ACTION_NAME.SHOW_REWARDED)
                        this._setRewardedState(REWARDED_STATE.OPENED)
                    },
                    onRewarded:  () => {
                        this._setRewardedState(REWARDED_STATE.REWARDED)
                    },
                    onClose: () => {
                        this._setRewardedState(REWARDED_STATE.CLOSED)
                    },
                    onError: error => {
                        this._rejectPromiseDecorator(ACTION_NAME.SHOW_REWARDED, error)
                        this._setRewardedState(REWARDED_STATE.FAILED)
                    }
                }
            })
        }

        return promiseDecorator.promise
    }


    // social
    addToHomeScreen() {
        if (!this.isAddToHomeScreenSupported)
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.ADD_TO_HOME_SCREEN)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.ADD_TO_HOME_SCREEN)

            this._platformSdk.shortcut.showPrompt()
                .then(result => {
                    if (result.outcome === 'accepted') {
                        this._resolvePromiseDecorator(ACTION_NAME.ADD_TO_HOME_SCREEN)
                        return
                    }

                    this._rejectPromiseDecorator(ACTION_NAME.ADD_TO_HOME_SCREEN)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(ACTION_NAME.ADD_TO_HOME_SCREEN, error)
                })
        }

        return promiseDecorator.promise
    }

    rate() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.RATE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.RATE)

            this._platformSdk.feedback.canReview()
                .then(result => {
                    if (result.value) {

                        this._platformSdk.feedback.requestReview()
                            .then(({ feedbackSent }) => {
                                if (feedbackSent) {
                                    this._resolvePromiseDecorator(ACTION_NAME.RATE)
                                    return
                                }

                                this._rejectPromiseDecorator(ACTION_NAME.RATE)
                            })
                            .catch(error => {
                                this._rejectPromiseDecorator(ACTION_NAME.RATE, error)
                            })

                        return
                    }

                    this._rejectPromiseDecorator(ACTION_NAME.RATE, result.reason)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(ACTION_NAME.RATE, error)
                })
        }

        return promiseDecorator.promise
    }


    // leaderboard
    setLeaderboardScore(options) {
        if (!this._isPlayerAuthorized)
            return Promise.reject()

        if (!this.#leaderboards || !options || !options.score || !options.leaderboardName)
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.SET_LEADERBOARD_SCORE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.SET_LEADERBOARD_SCORE)

            if (typeof options.score === 'string')
                options.score = parseInt(options.score)

            this.#leaderboards.setLeaderboardScore(options.leaderboardName, options.score)
                .then(result => {
                    this._resolvePromiseDecorator(ACTION_NAME.SET_LEADERBOARD_SCORE)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(ACTION_NAME.SET_LEADERBOARD_SCORE, error)
                })
        }

        return promiseDecorator.promise
    }

    getLeaderboardScore(options) {
        if (!this._isPlayerAuthorized)
            return Promise.reject()

        if (!this.#leaderboards || !options || !options.leaderboardName)
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_SCORE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_SCORE)

            this.#leaderboards.getLeaderboardPlayerEntry(options.leaderboardName)
                .then(result => {
                    this._resolvePromiseDecorator(ACTION_NAME.GET_LEADERBOARD_SCORE, result.score)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_SCORE, error)
                })
        }

        return promiseDecorator.promise
    }

    getLeaderboardEntries(options) {
        if (!this._isPlayerAuthorized)
            return Promise.reject()

        if (!this.#leaderboards || !options || !options.leaderboardName)
            return Promise.reject()

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_ENTRIES)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_ENTRIES)

            let parameters = {
                includeUser: false,
                quantityAround: 5,
                quantityTop: 5
            }

            if (typeof options.includeUser === 'boolean')
                parameters.includeUser = options.includeUser

            if (typeof options.quantityAround === 'string')
                options.quantityAround = parseInt(options.quantityAround)

            if (typeof options.quantityAround === 'number')
                parameters.quantityAround = options.quantityAround

            if (typeof options.quantityTop === 'string')
                options.quantityTop = parseInt(options.quantityTop)

            if (typeof options.quantityTop === 'number')
                parameters.quantityTop = options.quantityTop

            this.#leaderboards.getLeaderboardEntries(options.leaderboardName, parameters)
                .then(result => {
                    let entries = null

                    if (result && result.entries.length > 0) {
                        entries = result.entries.map(e => {
                            let photos = []
                            let photoSmall = e.player.getAvatarSrc('small')
                            let photoMedium = e.player.getAvatarSrc('medium')
                            let photoLarge = e.player.getAvatarSrc('large')

                            if (photoSmall)
                                photos.push(photoSmall)

                            if (photoMedium)
                                photos.push(photoMedium)

                            if (photoLarge)
                                photos.push(photoLarge)

                            return {
                                id: e.player.uniqueID,
                                score: e.score,
                                rank: e.rank,
                                name: e.player.publicName,
                                photos
                            }
                        })
                    }

                    this._resolvePromiseDecorator(ACTION_NAME.GET_LEADERBOARD_ENTRIES, entries)
                })
                .catch(error => {
                    this._rejectPromiseDecorator(ACTION_NAME.GET_LEADERBOARD_ENTRIES, error)
                })
        }

        return promiseDecorator.promise
    }


    #getPlayer(options) {
        return new Promise(resolve => {
            let parameters = {
                scopes: true
            }

            if (options && typeof options.scopes === 'boolean')
                parameters.scopes = options.scopes

            this._platformSdk.getPlayer(parameters)
                .then(player => {
                    this._playerId = player.getUniqueID()
                    this._isPlayerAuthorized = player.getMode() !== 'lite'

                    let name = player.getName()
                    if (name !== '')
                        this._playerName = name

                    this._playerPhotos = []
                    let photoSmall = player.getPhoto('small')
                    let photoMedium = player.getPhoto('medium')
                    let photoLarge = player.getPhoto('large')

                    if (photoSmall)
                        this._playerPhotos.push(photoSmall)

                    if (photoMedium)
                        this._playerPhotos.push(photoMedium)

                    if (photoLarge)
                        this._playerPhotos.push(photoLarge)

                    this.#yandexPlayer = player
                })
                .finally(() => {
                    resolve()
                })
        })
    }

    #saveGameData() {
        return new Promise((resolve, reject) => {
            if (this.#yandexPlayer) {
                this.#yandexPlayer.setData(this._gameData)
                    .then(() => {
                        resolve()
                    })
                    .catch(error => {
                        reject(error)
                    })

                return
            }

            this._saveGameDataToLocalStorage()
                .then(() => resolve())
                .catch(error => reject(error))
        })
    }

}

export default YandexPlatformBridge