const http = require('https');

const options = {
  method: 'POST',
  hostname: 'api.woovi.com',
  port: null,
  path: '/api/v1/charge?return_existing=true',
  headers: {
    Authorization: '{APP_ID}',
    'content-type': 'application/json'
  }
};

const req = http.request(options, function (res) {
  const chunks = [];

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });
});

req.write(JSON.stringify({
  correlationID: 'string',
  value: 0,
  type: 'DYNAMIC',
  comment: 'string',
  expiresIn: 0,
  expiresDate: 'string',
  dueDate: 'string',
  customer: {
    name: 'string',
    email: 'string',
    phone: 'string',
    taxID: 'string',
    correlationID: 'string',
    address: {
      zipcode: 'string',
      street: 'string',
      number: 'string',
      neighborhood: 'string',
      city: 'string',
      state: 'string',
      complement: 'string',
      country: 'string'
    }
  },
  ensureSameTaxID: true,
  fixedLocation: true,
  paymentLinkID: 'string',
  daysForDueDate: 0,
  daysAfterDueDate: 0,
  interests: {value: 0, type: 'FIXED'},
  fines: {value: 0, type: 'FIXED'},
  discountSettings: {
    modality: 'FIXED_VALUE_UNTIL_SPECIFIED_DATE',
    discountFixedDate: [{daysActive: 1, value: 0}],
    value: 1
  },
  additionalInfo: [{key: 'string', value: 'string'}],
  enableCashbackPercentage: true,
  enableCashbackExclusivePercentage: true,
  subaccount: 'string',
  splits: [{value: 0, pixKey: 'string', splitType: 'SPLIT_INTERNAL_TRANSFER'}]
}));
req.end();

Body
required
application/json
Data to create a new charge

correlationIDCopy link to correlationID
Type:string
required
Your correlation ID to keep track of this charge

valueCopy link to value
Type:number
required
Value in cents of this charge

additionalInfoCopy link to additionalInfo
Type:array object[]
Additional info of the charge

Show Child Attributesfor additionalInfo
commentCopy link to comment
Type:string
Comment to be added in infoPagador

customerCopy link to customer

One of
object
name
Type:string
required
taxID
Type:string
required
address
Type:object
Show Child Attributesfor address
correlationID
Type:string
email
Type:string
phone
Type:string
daysAfterDueDateCopy link to daysAfterDueDate
Type:number
Time in days that a charge is still payable after the deadline. This property is only considered for charges of type OVERDUE

daysForDueDateCopy link to daysForDueDate
Type:number
Time in days until the charge hits the deadline so fines and interests start applying. This property is only considered for charges of type OVERDUE

discountSettingsCopy link to discountSettings
Type:object
Discount settings for the charge. This property is only considered for charges of type OVERDUE.

How it interacts with fines and interests. Discount only applies to payments before the due date (controlled by daysForDueDate). On or after the due date the discount is gone, and fines (applied once) and interests (accruing per day) start adding on top of value. Use the day-by-day simulator to preview the totals a payer sees on each day of the charge lifecycle.

Modality enum follows the BACEN COBV (Cobrança com Vencimento) spec — see bacen.github.io/pix-api for the upstream reference.

Shape of the object depends on modality:

For FIXED_VALUE_UNTIL_SPECIFIED_DATE and PERCENTAGE_UNTIL_SPECIFIED_DATE, provide discountFixedDate (array of items with daysActive and value). When multiple entries match the current day (i.e. their daysActive window has not yet expired), the entry with the largest discount wins.
For the four advance-day modalities (VALUE_PER_RUNNING_DAY_ADVANCE, VALUE_PER_BUSINESS_DAY_ADVANCE, PERCENTAGE_PER_RUNNING_DAY_ADVANCE, PERCENTAGE_PER_BUSINESS_DAY_ADVANCE), provide a single value.
Rounding. Computed discount and interest amounts are rounded to the nearest cent.

Show Child Attributesfor discountSettings
dueDateCopy link to dueDate
Type:string
Due date for OVERDUE, BOLETO, or subscription charges in ISO 8601 format.

enableCashbackExclusivePercentageCopy link to enableCashbackExclusivePercentage
Type:boolean
true to enable fidelity cashback and false to disable.

enableCashbackPercentageCopy link to enableCashbackPercentage
Type:boolean
true to enable cashback and false to disable.

ensureSameTaxIDCopy link to ensureSameTaxID
Type:boolean
true to ensure that the payer taxID must be the same as the customer taxID.

Show additional propertiesfor Request Body
Responses

200
Charge ID and also the generated Dynamic BR Code to be rendered as a QRCode

400
An error message