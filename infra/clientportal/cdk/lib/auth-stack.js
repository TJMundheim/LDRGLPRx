"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
/**
 * AuthStack — passwordless Cognito (email-OTP via custom-auth flow)
 * + IdentityPool + Admins group + Lambda triggers.
 *
 * Cognito stores ONLY email. All other profile data lives in DynamoDB.
 */
class AuthStack extends cdk.Stack {
    userPool;
    userPoolClient;
    identityPool;
    constructor(scope, id, props) {
        super(scope, id, props);
        const lambdaDir = path.join(__dirname, '..', 'lambdas', 'auth');
        const mkFn = (name, file) => new aws_lambda_nodejs_1.NodejsFunction(this, name, {
            entry: path.join(lambdaDir, file),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            bundling: { target: 'node20', minify: false, sourceMap: true },
        });
        const defineAuthChallenge = mkFn('DefineAuthChallengeFn', 'define-auth-challenge.ts');
        const createAuthChallenge = mkFn('CreateAuthChallengeFn', 'create-auth-challenge.ts');
        const verifyAuthChallenge = mkFn('VerifyAuthChallengeFn', 'verify-auth-challenge.ts');
        const postConfirmation = mkFn('PostConfirmationFn', 'post-confirmation.ts');
        const postAuthentication = mkFn('PostAuthenticationFn', 'post-authentication.ts');
        // Email: createAuthChallenge invokes my4mlife-email-sender (Mailgun-backed).
        createAuthChallenge.addEnvironment('EMAIL_SENDER_FN', 'my4mlife-email-sender');
        createAuthChallenge.addToRolePolicy(new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [
                `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:function:my4mlife-email-sender`,
            ],
        }));
        // Wire Users table env var + permissions if provided.
        if (props?.usersTable) {
            const tableName = props.usersTable.tableName;
            postConfirmation.addEnvironment('USERS_TABLE', tableName);
            postAuthentication.addEnvironment('USERS_TABLE', tableName);
            props.usersTable.grantReadWriteData(postConfirmation);
            props.usersTable.grantReadWriteData(postAuthentication);
        }
        // UserPool — email-only, passwordless via custom auth.
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'clientportal-users',
            signInAliases: { email: true },
            signInCaseSensitive: false,
            autoVerify: { email: true },
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            // No name, phone, address, or custom attributes — DDB owns profile data.
            selfSignUpEnabled: true,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lambdaTriggers: {
                defineAuthChallenge,
                createAuthChallenge,
                verifyAuthChallengeResponse: verifyAuthChallenge,
                postConfirmation,
                postAuthentication,
            },
        });
        // App client — custom-auth ONLY. No password / SRP.
        this.userPoolClient = this.userPool.addClient('AppClient', {
            authFlows: { custom: true },
            generateSecret: false,
            preventUserExistenceErrors: true,
        });
        // Admins group.
        new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Admins',
            description: 'Administrative users for the client portal',
        });
        // Identity pool federated to the user pool.
        this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
            identityPoolName: 'clientportal_identity_pool',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
        const principal = (amr) => new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
            StringEquals: {
                'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
            },
            'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': amr },
        }, 'sts:AssumeRoleWithWebIdentity');
        const authRole = new iam.Role(this, 'AuthenticatedRole', {
            assumedBy: principal('authenticated'),
        });
        const unauthRole = new iam.Role(this, 'UnauthenticatedRole', {
            assumedBy: principal('unauthenticated'),
        });
        new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: authRole.roleArn,
                unauthenticated: unauthRole.roleArn,
            },
        });
        new cdk.CfnOutput(this, 'userPoolId', { value: this.userPool.userPoolId });
        new cdk.CfnOutput(this, 'userPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
        });
        new cdk.CfnOutput(this, 'identityPoolId', { value: this.identityPool.ref });
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLGlEQUFtQztBQUVuQyxpRUFBbUQ7QUFFbkQseURBQTJDO0FBQzNDLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFNL0Q7Ozs7O0dBS0c7QUFDSCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN0QixRQUFRLENBQW1CO0lBQzNCLGNBQWMsQ0FBeUI7SUFDdkMsWUFBWSxDQUEwQjtJQUV0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLEVBQUUsQ0FDMUMsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQztZQUNqQyxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1NBQy9ELENBQUMsQ0FBQztRQUVMLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUM5Qix1QkFBdUIsRUFDdkIsMEJBQTBCLENBQzNCLENBQUM7UUFDRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FDOUIsdUJBQXVCLEVBQ3ZC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SSxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7U0FDNUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztDQUNGO0FBM0lELDhCQTJJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBSdW50aW1lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcblxuZXhwb3J0IGludGVyZmFjZSBBdXRoU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgdXNlcnNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbn1cblxuLyoqXG4gKiBBdXRoU3RhY2sg4oCUIHBhc3N3b3JkbGVzcyBDb2duaXRvIChlbWFpbC1PVFAgdmlhIGN1c3RvbS1hdXRoIGZsb3cpXG4gKiArIElkZW50aXR5UG9vbCArIEFkbWlucyBncm91cCArIExhbWJkYSB0cmlnZ2Vycy5cbiAqXG4gKiBDb2duaXRvIHN0b3JlcyBPTkxZIGVtYWlsLiBBbGwgb3RoZXIgcHJvZmlsZSBkYXRhIGxpdmVzIGluIER5bmFtb0RCLlxuICovXG5leHBvcnQgY2xhc3MgQXV0aFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogQXV0aFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGxhbWJkYURpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdsYW1iZGFzJywgJ2F1dGgnKTtcbiAgICBjb25zdCBta0ZuID0gKG5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSA9PlxuICAgICAgbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihsYW1iZGFEaXIsIGZpbGUpLFxuICAgICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgfSk7XG5cbiAgICBjb25zdCBkZWZpbmVBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdEZWZpbmVBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ2RlZmluZS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCBjcmVhdGVBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdDcmVhdGVBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ2NyZWF0ZS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCB2ZXJpZnlBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdWZXJpZnlBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ3ZlcmlmeS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCBwb3N0Q29uZmlybWF0aW9uID0gbWtGbihcbiAgICAgICdQb3N0Q29uZmlybWF0aW9uRm4nLFxuICAgICAgJ3Bvc3QtY29uZmlybWF0aW9uLnRzJyxcbiAgICApO1xuICAgIGNvbnN0IHBvc3RBdXRoZW50aWNhdGlvbiA9IG1rRm4oXG4gICAgICAnUG9zdEF1dGhlbnRpY2F0aW9uRm4nLFxuICAgICAgJ3Bvc3QtYXV0aGVudGljYXRpb24udHMnLFxuICAgICk7XG5cbiAgICAvLyBFbWFpbDogY3JlYXRlQXV0aENoYWxsZW5nZSBpbnZva2VzIG15NG1saWZlLWVtYWlsLXNlbmRlciAoTWFpbGd1bi1iYWNrZWQpLlxuICAgIGNyZWF0ZUF1dGhDaGFsbGVuZ2UuYWRkRW52aXJvbm1lbnQoJ0VNQUlMX1NFTkRFUl9GTicsICdteTRtbGlmZS1lbWFpbC1zZW5kZXInKTtcbiAgICBjcmVhdGVBdXRoQ2hhbGxlbmdlLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydsYW1iZGE6SW52b2tlRnVuY3Rpb24nXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6bGFtYmRhOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06ZnVuY3Rpb246bXk0bWxpZmUtZW1haWwtc2VuZGVyYCxcbiAgICAgICAgXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBXaXJlIFVzZXJzIHRhYmxlIGVudiB2YXIgKyBwZXJtaXNzaW9ucyBpZiBwcm92aWRlZC5cbiAgICBpZiAocHJvcHM/LnVzZXJzVGFibGUpIHtcbiAgICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb3BzLnVzZXJzVGFibGUudGFibGVOYW1lO1xuICAgICAgcG9zdENvbmZpcm1hdGlvbi5hZGRFbnZpcm9ubWVudCgnVVNFUlNfVEFCTEUnLCB0YWJsZU5hbWUpO1xuICAgICAgcG9zdEF1dGhlbnRpY2F0aW9uLmFkZEVudmlyb25tZW50KCdVU0VSU19UQUJMRScsIHRhYmxlTmFtZSk7XG4gICAgICBwcm9wcy51c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwb3N0Q29uZmlybWF0aW9uKTtcbiAgICAgIHByb3BzLnVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHBvc3RBdXRoZW50aWNhdGlvbik7XG4gICAgfVxuXG4gICAgLy8gVXNlclBvb2wg4oCUIGVtYWlsLW9ubHksIHBhc3N3b3JkbGVzcyB2aWEgY3VzdG9tIGF1dGguXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogJ2NsaWVudHBvcnRhbC11c2VycycsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICBzaWduSW5DYXNlU2Vuc2l0aXZlOiBmYWxzZSxcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxuICAgICAgfSxcbiAgICAgIC8vIE5vIG5hbWUsIHBob25lLCBhZGRyZXNzLCBvciBjdXN0b20gYXR0cmlidXRlcyDigJQgRERCIG93bnMgcHJvZmlsZSBkYXRhLlxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBsYW1iZGFUcmlnZ2Vyczoge1xuICAgICAgICBkZWZpbmVBdXRoQ2hhbGxlbmdlLFxuICAgICAgICBjcmVhdGVBdXRoQ2hhbGxlbmdlLFxuICAgICAgICB2ZXJpZnlBdXRoQ2hhbGxlbmdlUmVzcG9uc2U6IHZlcmlmeUF1dGhDaGFsbGVuZ2UsXG4gICAgICAgIHBvc3RDb25maXJtYXRpb24sXG4gICAgICAgIHBvc3RBdXRoZW50aWNhdGlvbixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBcHAgY2xpZW50IOKAlCBjdXN0b20tYXV0aCBPTkxZLiBObyBwYXNzd29yZCAvIFNSUC5cbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gdGhpcy51c2VyUG9vbC5hZGRDbGllbnQoJ0FwcENsaWVudCcsIHtcbiAgICAgIGF1dGhGbG93czogeyBjdXN0b206IHRydWUgfSxcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQWRtaW5zIGdyb3VwLlxuICAgIG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgJ0FkbWluc0dyb3VwJywge1xuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZ3JvdXBOYW1lOiAnQWRtaW5zJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWRtaW5pc3RyYXRpdmUgdXNlcnMgZm9yIHRoZSBjbGllbnQgcG9ydGFsJyxcbiAgICB9KTtcblxuICAgIC8vIElkZW50aXR5IHBvb2wgZmVkZXJhdGVkIHRvIHRoZSB1c2VyIHBvb2wuXG4gICAgdGhpcy5pZGVudGl0eVBvb2wgPSBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2wodGhpcywgJ0lkZW50aXR5UG9vbCcsIHtcbiAgICAgIGlkZW50aXR5UG9vbE5hbWU6ICdjbGllbnRwb3J0YWxfaWRlbnRpdHlfcG9vbCcsXG4gICAgICBhbGxvd1VuYXV0aGVudGljYXRlZElkZW50aXRpZXM6IGZhbHNlLFxuICAgICAgY29nbml0b0lkZW50aXR5UHJvdmlkZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjbGllbnRJZDogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBwcmluY2lwYWwgPSAoYW1yOiAnYXV0aGVudGljYXRlZCcgfCAndW5hdXRoZW50aWNhdGVkJykgPT5cbiAgICAgIG5ldyBpYW0uRmVkZXJhdGVkUHJpbmNpcGFsKFxuICAgICAgICAnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tJyxcbiAgICAgICAge1xuICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphdWQnOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnRm9yQW55VmFsdWU6U3RyaW5nTGlrZSc6IHsgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXInOiBhbXIgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ3N0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5JyxcbiAgICAgICk7XG5cbiAgICBjb25zdCBhdXRoUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXV0aGVudGljYXRlZFJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IHByaW5jaXBhbCgnYXV0aGVudGljYXRlZCcpLFxuICAgIH0pO1xuICAgIGNvbnN0IHVuYXV0aFJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1VuYXV0aGVudGljYXRlZFJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IHByaW5jaXBhbCgndW5hdXRoZW50aWNhdGVkJyksXG4gICAgfSk7XG5cbiAgICBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudCh0aGlzLCAnSWRlbnRpdHlQb29sUm9sZXMnLCB7XG4gICAgICBpZGVudGl0eVBvb2xJZDogdGhpcy5pZGVudGl0eVBvb2wucmVmLFxuICAgICAgcm9sZXM6IHtcbiAgICAgICAgYXV0aGVudGljYXRlZDogYXV0aFJvbGUucm9sZUFybixcbiAgICAgICAgdW5hdXRoZW50aWNhdGVkOiB1bmF1dGhSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ3VzZXJQb29sSWQnLCB7IHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ3VzZXJQb29sQ2xpZW50SWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdpZGVudGl0eVBvb2xJZCcsIHsgdmFsdWU6IHRoaXMuaWRlbnRpdHlQb29sLnJlZiB9KTtcbiAgfVxufVxuIl19