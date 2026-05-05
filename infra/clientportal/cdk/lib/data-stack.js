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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLG1FQUFxRDtBQUVyRCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN0QixVQUFVLENBQWlCO0lBQzNCLGFBQWEsQ0FBaUI7SUFDOUIsa0JBQWtCLENBQWlCO0lBQ25DLHVCQUF1QixDQUFpQjtJQUN4QyxhQUFhLENBQWlCO0lBQzlCLGdCQUFnQixDQUFpQjtJQUNqQyxlQUFlLENBQWlCO0lBQ2hDLGNBQWMsQ0FBaUI7SUFDL0IsZ0JBQWdCLENBQWlCO0lBRWpELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUzRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV4RCxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUMxRCxTQUFTLEVBQUUsV0FBVztZQUN0QixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ2xFLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07WUFDdkMsa0JBQWtCLEVBQUUsSUFBSTtTQUN6QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sY0FBYyxDQUFDLElBQVk7UUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDM0MsU0FBUyxFQUFFLElBQUk7WUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ2pFLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07WUFDdkMsa0JBQWtCLEVBQUUsSUFBSTtTQUN6QixDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDNUIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDcEUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRztTQUM1QyxDQUFDLENBQUM7UUFDSCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBWTtRQUM5QixPQUFPLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO1lBQ3BDLFNBQVMsRUFBRSxJQUFJO1lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNqRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1lBQ3ZDLGtCQUFrQixFQUFFLElBQUk7U0FDekIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBN0RELDhCQTZEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5cbmV4cG9ydCBjbGFzcyBEYXRhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBwcm9ncmFtc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IHdlZWtseUNvbnRlbnRUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBkaXNjb3ZlcnlSZXNwb25zZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBvdXRjb21lc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGludGFrZUZvcm1zVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBwdWJsaWMgcmVhZG9ubHkgYWRtaW5RdWV1ZVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGFwcENvbmZpZ1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IHRpZXJDYXRhbG9nVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFVzZXItb3duZWQgdGFibGVzOiBQSyBpZCArIGJ5T3duZXIgR1NJXG4gICAgdGhpcy51c2Vyc1RhYmxlID0gdGhpcy51c2VyT3duZWRUYWJsZShcIlVzZXJzXCIpO1xuICAgIHRoaXMuZGlzY292ZXJ5UmVzcG9uc2VzVGFibGUgPSB0aGlzLnVzZXJPd25lZFRhYmxlKFwiRGlzY292ZXJ5UmVzcG9uc2VzXCIpO1xuICAgIHRoaXMub3V0Y29tZXNUYWJsZSA9IHRoaXMudXNlck93bmVkVGFibGUoXCJPdXRjb21lc1wiKTtcbiAgICB0aGlzLmludGFrZUZvcm1zVGFibGUgPSB0aGlzLnVzZXJPd25lZFRhYmxlKFwiSW50YWtlRm9ybXNcIik7XG5cbiAgICAvLyBTaW1wbGUgdGFibGVzOiBQSyBpZFxuICAgIHRoaXMucHJvZ3JhbXNUYWJsZSA9IHRoaXMuc2ltcGxlVGFibGUoXCJQcm9ncmFtc1wiKTtcbiAgICB0aGlzLndlZWtseUNvbnRlbnRUYWJsZSA9IHRoaXMuc2ltcGxlVGFibGUoXCJXZWVrbHlDb250ZW50XCIpO1xuICAgIHRoaXMuYWRtaW5RdWV1ZVRhYmxlID0gdGhpcy5zaW1wbGVUYWJsZShcIkFkbWluUXVldWVcIik7XG4gICAgdGhpcy50aWVyQ2F0YWxvZ1RhYmxlID0gdGhpcy5zaW1wbGVUYWJsZShcIlRpZXJDYXRhbG9nXCIpO1xuXG4gICAgLy8gQXBwQ29uZmlnOiBQSyBrZXlcbiAgICB0aGlzLmFwcENvbmZpZ1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwiQXBwQ29uZmlnXCIsIHtcbiAgICAgIHRhYmxlTmFtZTogXCJBcHBDb25maWdcIixcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJrZXlcIiwgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgdXNlck93bmVkVGFibGUobmFtZTogc3RyaW5nKTogZHluYW1vZGIuVGFibGUge1xuICAgIGNvbnN0IHRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIG5hbWUsIHtcbiAgICAgIHRhYmxlTmFtZTogbmFtZSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJpZFwiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiB0cnVlLFxuICAgIH0pO1xuICAgIHRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogXCJieU93bmVyXCIsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJvd25lclwiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcbiAgICByZXR1cm4gdGFibGU7XG4gIH1cblxuICBwcml2YXRlIHNpbXBsZVRhYmxlKG5hbWU6IHN0cmluZyk6IGR5bmFtb2RiLlRhYmxlIHtcbiAgICByZXR1cm4gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIG5hbWUsIHtcbiAgICAgIHRhYmxlTmFtZTogbmFtZSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogXCJpZFwiLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiB0cnVlLFxuICAgIH0pO1xuICB9XG59XG4iXX0=