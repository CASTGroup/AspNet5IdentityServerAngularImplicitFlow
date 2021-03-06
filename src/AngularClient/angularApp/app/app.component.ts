import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { OidcSecurityService } from './auth/services/oidc.security.service';
import { LocaleService, TranslationService, Language } from 'angular-l10n';
import './app.component.css';
import { AuthorizationResult } from './auth/models/authorization-result';
import { AuthorizationState } from './auth/models/authorization-state.enum';
// import { ValidationResult } from './auth/models/validation-result.enum';

@Component({
    selector: 'app-component',
    templateUrl: 'app.component.html',
})

export class AppComponent implements OnInit, OnDestroy {

    @Language() lang = '';

    title = '';

    isAuthorizedSubscription: Subscription | undefined;
    isAuthorized = false;

    onChecksessionChanged: Subscription | undefined;
    checksession = false;

    constructor(
        public oidcSecurityService: OidcSecurityService,
        public locale: LocaleService,
        private router: Router,
        public translation: TranslationService
    ) {
        console.log('AppComponent STARTING');

        if (this.oidcSecurityService.moduleSetup) {
            this.doCallbackLogicIfRequired();
        } else {
            this.oidcSecurityService.onModuleSetup.subscribe(() => {
                this.doCallbackLogicIfRequired();
            });
        }

        this.oidcSecurityService.onCheckSessionChanged.subscribe(
            (checksession: boolean) => {
                console.log('...recieved a check session event');
                this.checksession = checksession;
            });

        this.oidcSecurityService.onAuthorizationResult.subscribe(
            (authorizationResult: AuthorizationResult) => {
                this.onAuthorizationResultComplete(authorizationResult);
            });
    }

    ngOnInit() {
        this.isAuthorizedSubscription = this.oidcSecurityService.getIsAuthorized().subscribe(
            (isAuthorized: boolean) => {
                this.isAuthorized = isAuthorized;
            });
    }

    changeCulture(language: string, country: string) {
        this.locale.setDefaultLocale(language, country);
        console.log('set language: ' + language);
    }

    ngOnDestroy(): void {
        if (this.isAuthorizedSubscription) {
            this.isAuthorizedSubscription.unsubscribe();
        }
    }

    login() {
        console.log('start login');

        let culture = 'de-CH';
        if (this.locale.getCurrentCountry()) {
            culture = this.locale.getCurrentLanguage() + '-' + this.locale.getCurrentCountry();
        }

        this.oidcSecurityService.setCustomRequestParameters({ 'ui_locales': culture});

        this.oidcSecurityService.authorize();
    }

    refreshSession() {
        console.log('start refreshSession');
        this.oidcSecurityService.authorize();
    }

    logout() {
        console.log('start logoff');
        this.oidcSecurityService.logoff();
    }

    private doCallbackLogicIfRequired() {
        if (window.location.hash) {
            this.oidcSecurityService.authorizedImplicitFlowCallback();
        }
    }

    private onAuthorizationResultComplete(authorizationResult: AuthorizationResult) {

        console.log('Auth result received AuthorizationState:'
            + authorizationResult.authorizationState
            + ' validationResult:' + authorizationResult.validationResult);

        this.oidcSecurityService.getUserData().subscribe(
            (data: any) => {
                console.warn(data);
            });
        

        if (authorizationResult.authorizationState === AuthorizationState.unauthorized) {
            if (window.parent) {
                // sent from the child iframe, for example the silent renew
                this.router.navigate(['/unauthorized']);
            } else {
                window.location.href = '/unauthorized';
            }
        }
    }
}
