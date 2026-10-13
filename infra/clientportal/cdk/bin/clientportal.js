#!/usr/bin/env node
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
const cdk = __importStar(require("aws-cdk-lib"));
const clientportal_stack_1 = require("../lib/clientportal-stack");
const data_stack_1 = require("../lib/data-stack");
const auth_stack_1 = require("../lib/auth-stack");
const api_stack_1 = require("../lib/api-stack");
const lead_capture_stack_1 = require("../lib/lead-capture-stack");
const app = new cdk.App();
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};
new clientportal_stack_1.ClientPortalStack(app, 'ClientPortalStack', { env });
const dataStack = new data_stack_1.DataStack(app, 'DataStack', { env });
const authStack = new auth_stack_1.AuthStack(app, 'AuthStack', { env, usersTable: dataStack.usersTable, contactTable: dataStack.contactTable });
new lead_capture_stack_1.LeadCaptureStack(app, 'LeadCaptureStack', { env, usersTable: dataStack.usersTable, contactTable: dataStack.contactTable });
new api_stack_1.ApiStack(app, 'ApiStack', {
    env,
    userPool: authStack.userPool,
    usersTable: dataStack.usersTable,
    discoveryResponsesTable: dataStack.discoveryResponsesTable,
    outcomesTable: dataStack.outcomesTable,
    intakeFormsTable: dataStack.intakeFormsTable,
    programsTable: dataStack.programsTable,
    weeklyContentTable: dataStack.weeklyContentTable,
    adminQueueTable: dataStack.adminQueueTable,
    appConfigTable: dataStack.appConfigTable,
    tierCatalogTable: dataStack.tierCatalogTable,
    contactTable: dataStack.contactTable,
    eventsTable: dataStack.eventsTable,
    eventRsvpsTable: dataStack.eventRsvpsTable,
    adherenceTable: dataStack.adherenceTable,
    patientRecordsTable: dataStack.patientRecordsTable,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50cG9ydGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpZW50cG9ydGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGlEQUFtQztBQUNuQyxrRUFBOEQ7QUFDOUQsa0RBQThDO0FBQzlDLGtEQUE4QztBQUM5QyxnREFBNEM7QUFDNUMsa0VBQTZEO0FBRTdELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO0lBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFdBQVc7Q0FDdEQsQ0FBQztBQUVGLElBQUksc0NBQWlCLENBQUMsR0FBRyxFQUFFLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0FBQ25JLElBQUkscUNBQWdCLENBQUMsR0FBRyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztBQUMvSCxJQUFJLG9CQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRTtJQUM1QixHQUFHO0lBQ0gsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO0lBQzVCLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtJQUNoQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsdUJBQXVCO0lBQzFELGFBQWEsRUFBRSxTQUFTLENBQUMsYUFBYTtJQUN0QyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsZ0JBQWdCO0lBQzVDLGFBQWEsRUFBRSxTQUFTLENBQUMsYUFBYTtJQUN0QyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsa0JBQWtCO0lBQ2hELGVBQWUsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUMxQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7SUFDeEMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLGdCQUFnQjtJQUM1QyxZQUFZLEVBQUUsU0FBUyxDQUFDLFlBQVk7SUFDcEMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXO0lBQ2xDLGVBQWUsRUFBRSxTQUFTLENBQUMsZUFBZTtJQUMxQyxjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWM7SUFDeEMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLG1CQUFtQjtDQUNuRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ2xpZW50UG9ydGFsU3RhY2sgfSBmcm9tICcuLi9saWIvY2xpZW50cG9ydGFsLXN0YWNrJztcbmltcG9ydCB7IERhdGFTdGFjayB9IGZyb20gJy4uL2xpYi9kYXRhLXN0YWNrJztcbmltcG9ydCB7IEF1dGhTdGFjayB9IGZyb20gJy4uL2xpYi9hdXRoLXN0YWNrJztcbmltcG9ydCB7IEFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL2FwaS1zdGFjayc7XG5pbXBvcnQgeyBMZWFkQ2FwdHVyZVN0YWNrIH0gZnJvbSAnLi4vbGliL2xlYWQtY2FwdHVyZS1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gPz8gJ3VzLWVhc3QtMScsXG59O1xuXG5uZXcgQ2xpZW50UG9ydGFsU3RhY2soYXBwLCAnQ2xpZW50UG9ydGFsU3RhY2snLCB7IGVudiB9KTtcbmNvbnN0IGRhdGFTdGFjayA9IG5ldyBEYXRhU3RhY2soYXBwLCAnRGF0YVN0YWNrJywgeyBlbnYgfSk7XG5jb25zdCBhdXRoU3RhY2sgPSBuZXcgQXV0aFN0YWNrKGFwcCwgJ0F1dGhTdGFjaycsIHsgZW52LCB1c2Vyc1RhYmxlOiBkYXRhU3RhY2sudXNlcnNUYWJsZSwgY29udGFjdFRhYmxlOiBkYXRhU3RhY2suY29udGFjdFRhYmxlIH0pO1xubmV3IExlYWRDYXB0dXJlU3RhY2soYXBwLCAnTGVhZENhcHR1cmVTdGFjaycsIHsgZW52LCB1c2Vyc1RhYmxlOiBkYXRhU3RhY2sudXNlcnNUYWJsZSwgY29udGFjdFRhYmxlOiBkYXRhU3RhY2suY29udGFjdFRhYmxlIH0pO1xubmV3IEFwaVN0YWNrKGFwcCwgJ0FwaVN0YWNrJywge1xuICBlbnYsXG4gIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXG4gIHVzZXJzVGFibGU6IGRhdGFTdGFjay51c2Vyc1RhYmxlLFxuICBkaXNjb3ZlcnlSZXNwb25zZXNUYWJsZTogZGF0YVN0YWNrLmRpc2NvdmVyeVJlc3BvbnNlc1RhYmxlLFxuICBvdXRjb21lc1RhYmxlOiBkYXRhU3RhY2sub3V0Y29tZXNUYWJsZSxcbiAgaW50YWtlRm9ybXNUYWJsZTogZGF0YVN0YWNrLmludGFrZUZvcm1zVGFibGUsXG4gIHByb2dyYW1zVGFibGU6IGRhdGFTdGFjay5wcm9ncmFtc1RhYmxlLFxuICB3ZWVrbHlDb250ZW50VGFibGU6IGRhdGFTdGFjay53ZWVrbHlDb250ZW50VGFibGUsXG4gIGFkbWluUXVldWVUYWJsZTogZGF0YVN0YWNrLmFkbWluUXVldWVUYWJsZSxcbiAgYXBwQ29uZmlnVGFibGU6IGRhdGFTdGFjay5hcHBDb25maWdUYWJsZSxcbiAgdGllckNhdGFsb2dUYWJsZTogZGF0YVN0YWNrLnRpZXJDYXRhbG9nVGFibGUsXG4gIGNvbnRhY3RUYWJsZTogZGF0YVN0YWNrLmNvbnRhY3RUYWJsZSxcbiAgZXZlbnRzVGFibGU6IGRhdGFTdGFjay5ldmVudHNUYWJsZSxcbiAgZXZlbnRSc3Zwc1RhYmxlOiBkYXRhU3RhY2suZXZlbnRSc3Zwc1RhYmxlLFxuICBhZGhlcmVuY2VUYWJsZTogZGF0YVN0YWNrLmFkaGVyZW5jZVRhYmxlLFxuICBwYXRpZW50UmVjb3Jkc1RhYmxlOiBkYXRhU3RhY2sucGF0aWVudFJlY29yZHNUYWJsZSxcbn0pO1xuIl19