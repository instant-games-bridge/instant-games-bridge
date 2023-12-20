import PlatformBridgeBase from './PlatformBridgeBase'
import { addJavaScript, waitFor } from '../common/utils'
import {
    PLATFORM_ID,
    ACTION_NAME, LOGIN_STATUS,
} from '../constants'

const getSdkUrl = (gameId) => `//vkplay.ru/app/${gameId}/static/mailru.core.js`

class VkPlayPlatformBridge extends PlatformBridgeBase {
    // platform
    get platformId() {
        return PLATFORM_ID.VK_PLAY
    }

    // player
    get isPlayerAuthorizationSupported() {
        return true
    }

    get #callbacks() {
        return {
            appid: this.#gameId,
            userProfileCallback: (profile) => this.#setProfile(profile),
            getLoginStatusCallback: (status) => this.#setLoginStatus(status),
            registerUserCallback: (registerInfo) => this.#setRegistrationInfo(registerInfo),
        }
    }

    #gameId = null

    #setProfile(profileData) {
        if (profileData.status === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.GET_PROFILE, profileData.errmsg)
            return
        }

        this._resolvePromiseDecorator(ACTION_NAME.GET_PROFILE, {
            _playerId: profileData.uid,
            _playerName: profileData.nick,
            _playerPhotos: [profileData.avatar],
        })
    }

    #setLoginStatus(loginInfo) {
        if (loginInfo.status === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.GET_LOGIN_STATUS, loginInfo.errmsg)
            return
        }

        this._resolvePromiseDecorator(ACTION_NAME.GET_LOGIN_STATUS, {
            _isPlayerAuthorized: loginInfo.loginStatus === LOGIN_STATUS.REGISTRATED || loginInfo.loginStatus === LOGIN_STATUS.PREMIUM_REGISTRATED,
        })
    }

    #setRegistrationInfo(regInfo) {
        if (regInfo.status === 'error') {
            this._rejectPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER, regInfo.errmsg)
            return
        }

        this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
    }

    initialize() {
        if (this._isInitialized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            this.#gameId = this._options.gameId

            addJavaScript(getSdkUrl(this.#gameId)).then(() => {
                waitFor('iframeApi').then(() => {
                    if (!window.iframeApi) {
                        const error = 'Cannot find iframeApi function'
                        this._rejectPromiseDecorator(ACTION_NAME.INITIALIZE, error)
                    }
                    window.iframeApi(this.#callbacks)
                        .then((sdk) => {
                            this._platformSdk = sdk
                            const getLoginStatusPromise = this.#getLoginStatus()
                            const getPlayerPromise = this.#getProfile()

                            Promise
                                .all([getLoginStatusPromise, getPlayerPromise])
                                .finally(() => {
                                    this._isInitialized = true
                                    this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)
                                })
                        })
                })
            })
        }

        return promiseDecorator.promise
    }

    // player

    authorizePlayer() {
        if (this._isPlayerAuthorized) {
            return Promise.resolve()
        }
        const promiseDecorator = this._getPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
        if (!promiseDecorator) {
            this._platformSdk.registerUser()
        }
        return promiseDecorator.promise.then(() => this._platformSdk.reloadWindow())
    }

    #getProfile() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.GET_PROFILE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.GET_PROFILE)
            this._platformSdk.userProfile()
        }
        return promiseDecorator.promise.then((profile) => {
            const { _playerId, _playerName, _playerPhotos } = profile
            this._playerId = _playerId
            this._playerName = _playerName
            this._playerPhotos = _playerPhotos
        })
    }

    #getLoginStatus() {
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.GET_LOGIN_STATUS)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.GET_LOGIN_STATUS)
            this._platformSdk.getLoginStatus()
        }
        return promiseDecorator.promise.then((loginInfo) => {
            const { _isPlayerAuthorized } = loginInfo
            this._isPlayerAuthorized = _isPlayerAuthorized
        })
    }
}

export default VkPlayPlatformBridge
