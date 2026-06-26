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
exports.DataStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
class DataStack extends cdk.Stack {
    usersTable;
    programsTable;
    weeklyContentTable;
    discoveryResponsesTable;
    outcomesTable;
    intakeFormsTable;
    adminQueueTable;
    appConfigTable;
    tierCatalogTable;
    contactTable;
    eventsTable;
    eventRsvpsTable;
    adherenceTable;
    patientRecordsTable;
    constructor(scope, id, props) {
        super(scope, id, props);
        // User-owned tables: PK id + byOwner GSI
        this.usersTable = this.userOwnedTable("Users");
        this.discoveryResponsesTable = this.userOwnedTable("DiscoveryResponses");
        this.outcomesTable = this.userOwnedTable("Outcomes");
        this.intakeFormsTable = this.userOwnedTable("IntakeForms");
        // Simple tables: PK id
        this.programsTable = this.simpleTable("Programs");
        this.weeklyContentTable = this.simpleTable("WeeklyContent");
        this.adminQueueTable = this.simpleTable("AdminQueue");
        this.tierCatalogTable = this.simpleTable("TierCatalog");
        // Contact / Events / EventRSVPs already exist in AWS (created outside CDK).
        // Import by name to avoid recreation errors.
        this.contactTable = dynamodb.Table.fromTableName(this, "Contact", "Contact");
        this.eventsTable = dynamodb.Table.fromTableName(this, "Events", "Events");
        this.eventRsvpsTable = dynamodb.Table.fromTableName(this, "EventRSVPs", "EventRSVPs");
        this.adherenceTable = dynamodb.Table.fromTableName(this, "Adherence", "Adherence");
        this.patientRecordsTable = dynamodb.Table.fromTableName(this, "PatientRecords", "PatientRecords");
        // AppConfig: PK key
        this.appConfigTable = new dynamodb.Table(this, "AppConfig", {
            tableName: "AppConfig",
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "key", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            deletionProtection: true,
        });
    }
    userOwnedTable(name) {
        const table = new dynamodb.Table(this, name, {
            tableName: name,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            deletionProtection: true,
        });
        table.addGlobalSecondaryIndex({
            indexName: "byOwner",
            partitionKey: { name: "owner", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        return table;
    }
    simpleTable(name) {
        return new dynamodb.Table(this, name, {
            tableName: name,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            deletionProtection: true,
        });
    }
}
exports.DataStack = DataStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLG1FQUFxRDtBQUVyRCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN0QixVQUFVLENBQWlCO0lBQzNCLGFBQWEsQ0FBaUI7SUFDOUIsa0JBQWtCLENBQWlCO0lBQ25DLHVCQUF1QixDQUFpQjtJQUN4QyxhQUFhLENBQWlCO0lBQzlCLGdCQUFnQixDQUFpQjtJQUNqQyxlQUFlLENBQWlCO0lBQ2hDLGNBQWMsQ0FBaUI7SUFDL0IsZ0JBQWdCLENBQWlCO0lBQ2pDLFlBQVksQ0FBa0I7SUFDOUIsV0FBVyxDQUFrQjtJQUM3QixlQUFlLENBQWtCO0lBQ2pDLGNBQWMsQ0FBa0I7SUFDaEMsbUJBQW1CLENBQWtCO0lBRXJELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUzRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxrQkFBa0IsR0FB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RjtBQTFFRCw4QkEwRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xuXG5leHBvcnQgY2xhc3MgRGF0YVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgcHJvZ3JhbXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSB3ZWVrbHlDb250ZW50VGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgZGlzY292ZXJ5UmVzcG9uc2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgb3V0Y29tZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBpbnRha2VGb3Jtc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGFkbWluUXVldWVUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBhcHBDb25maWdUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSB0aWVyQ2F0YWxvZ1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGNvbnRhY3RUYWJsZTogZHluYW1vZGIuSVRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzVGFibGU6IGR5bmFtb2RiLklUYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGV2ZW50UnN2cHNUYWJsZTogZHluYW1vZGIuSVRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgYWRoZXJlbmNlVGFibGU6IGR5bmFtb2RiLklUYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IHBhdGllbnRSZWNvcmRzVGFibGU6IGR5bmFtb2RiLklUYWJsZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBVc2VyLW93bmVkIHRhYmxlczogUEsgaWQgKyBieU93bmVyIEdTSVxuICAgIHRoaXMudXNlcnNUYWJsZSA9IHRoaXMudXNlck93bmVkVGFibGUoXCJVc2Vyc1wiKTtcbiAgICB0aGlzLmRpc2NvdmVyeVJlc3BvbnNlc1RhYmxlID0gdGhpcy51c2VyT3duZWRUYWJsZShcIkRpc2NvdmVyeVJlc3BvbnNlc1wiKTtcbiAgICB0aGlzLm91dGNvbWVzVGFibGUgPSB0aGlzLnVzZXJPd25lZFRhYmxlKFwiT3V0Y29tZXNcIik7XG4gICAgdGhpcy5pbnRha2VGb3Jtc1RhYmxlID0gdGhpcy51c2VyT3duZWRUYWJsZShcIkludGFrZUZvcm1zXCIpO1xuXG4gICAgLy8gU2ltcGxlIHRhYmxlczogUEsgaWRcbiAgICB0aGlzLnByb2dyYW1zVGFibGUgPSB0aGlzLnNpbXBsZVRhYmxlKFwiUHJvZ3JhbXNcIik7XG4gICAgdGhpcy53ZWVrbHlDb250ZW50VGFibGUgPSB0aGlzLnNpbXBsZVRhYmxlKFwiV2Vla2x5Q29udGVudFwiKTtcbiAgICB0aGlzLmFkbWluUXVldWVUYWJsZSA9IHRoaXMuc2ltcGxlVGFibGUoXCJBZG1pblF1ZXVlXCIpO1xuICAgIHRoaXMudGllckNhdGFsb2dUYWJsZSA9IHRoaXMuc2ltcGxlVGFibGUoXCJUaWVyQ2F0YWxvZ1wiKTtcblxuICAgIC8vIENvbnRhY3QgLyBFdmVudHMgLyBFdmVudFJTVlBzIGFscmVhZHkgZXhpc3QgaW4gQVdTIChjcmVhdGVkIG91dHNpZGUgQ0RLKS5cbiAgICAvLyBJbXBvcnQgYnkgbmFtZSB0byBhdm9pZCByZWNyZWF0aW9uIGVycm9ycy5cbiAgICB0aGlzLmNvbnRhY3RUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgXCJDb250YWN0XCIsIFwiQ29udGFjdFwiKTtcbiAgICB0aGlzLmV2ZW50c1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCBcIkV2ZW50c1wiLCBcIkV2ZW50c1wiKTtcbiAgICB0aGlzLmV2ZW50UnN2cHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgXCJFdmVudFJTVlBzXCIsIFwiRXZlbnRSU1ZQc1wiKTtcbiAgICB0aGlzLmFkaGVyZW5jZVRhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCBcIkFkaGVyZW5jZVwiLCBcIkFkaGVyZW5jZVwiKTtcbiAgICB0aGlzLnBhdGllbnRSZWNvcmRzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsIFwiUGF0aWVudFJlY29yZHNcIiwgXCJQYXRpZW50UmVjb3Jkc1wiKTtcblxuICAgIC8vIEFwcENvbmZpZzogUEsga2V5XG4gICAgdGhpcy5hcHBDb25maWdUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcIkFwcENvbmZpZ1wiLCB7XG4gICAgICB0YWJsZU5hbWU6IFwiQXBwQ29uZmlnXCIsXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwia2V5XCIsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IHRydWUsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHVzZXJPd25lZFRhYmxlKG5hbWU6IHN0cmluZyk6IGR5bmFtb2RiLlRhYmxlIHtcbiAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBuYW1lLCB7XG4gICAgICB0YWJsZU5hbWU6IG5hbWUsXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwiaWRcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcbiAgICB9KTtcbiAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6IFwiYnlPd25lclwiLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwib3duZXJcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRhYmxlO1xuICB9XG5cbiAgcHJpdmF0ZSBzaW1wbGVUYWJsZShuYW1lOiBzdHJpbmcpOiBkeW5hbW9kYi5UYWJsZSB7XG4gICAgcmV0dXJuIG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBuYW1lLCB7XG4gICAgICB0YWJsZU5hbWU6IG5hbWUsXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwiaWRcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcbiAgICB9KTtcbiAgfVxufVxuIl19