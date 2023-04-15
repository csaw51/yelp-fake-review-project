session server;

/* Start checking for existence of each input table */
exists0=doesTableExist("CASUSER(Matt.Pless@sas.com)", "YELP_ADDRESSES");
if exists0 == 0 then do;
  print "Table "||"CASUSER(Matt.Pless@sas.com)"||"."||"YELP_ADDRESSES" || " does not exist.";
  print "UserErrorCode: 100";
  exit 1;
end;
print "Input table: "||"CASUSER(Matt.Pless@sas.com)"||"."||"YELP_ADDRESSES"||" found.";
/* End checking for existence of each input table */


  _dp_inputTable="YELP_ADDRESSES";
  _dp_inputCaslib="CASUSER(Matt.Pless@sas.com)";

  _dp_outputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_outputCaslib="CASUSER(Matt.Pless@sas.com)";

/* BEGIN statement 036623f2_eefe_11e6_bc64_92361f002671          datastep_statement */
dataStep.runCode result=r status=rc / code='/* BEGIN data step with the output table data */
data "994d6609-b1f5-4397-af52-938b2cebaf5a" (caslib="CASUSER(Matt.Pless@sas.com)" promote="no");
/* Set the input set */
set "YELP_ADDRESSES" (caslib="CASUSER(Matt.Pless@sas.com)" );
select;
when (geodist(''latitude''n, ''longitude''n, 34.4208, -119.6982, "M") < 50) do; metro="Santa Barbara"; mlat=34.4208; mlong=-119.6982; end;
when (geodist(''latitude''n, ''longitude''n, 39.9526, -75.1652, "M") < 50) do; metro="Philadelphia"; mlat=39.9526; mlong=-75.1652; end;
when (geodist(''latitude''n, ''longitude''n, 32.2540, -110.9742, "M") < 50) do; metro="Tucson"; mlat=32.2540; mlong=-110.9742; end;
when (geodist(''latitude''n, ''longitude''n, 29.9511, -90.0715, "M") < 50) do; metro="New Orleans"; mlat=29.9511; mlong=-90.0715; end;
when (geodist(''latitude''n, ''longitude''n, 36.1627, -86.7816, "M") < 50) do; metro="Nashville"; mlat=36.1627; mlong=-86.7816; end;  
when (geodist(''latitude''n, ''longitude''n, 43.6150, -116.2023, "M") < 50) do; metro="Boise"; mlat=43.6150; mlong=-116.2023; end;
when (geodist(''latitude''n, ''longitude''n, 27.9506, -82.4572, "M") < 50) do; metro="Tampa"; mlat=27.9506; mlong=-82.4572; end;
when (geodist(''latitude''n, ''longitude''n, 38.6270, -90.1994, "M") < 50) do; metro="St. Louis"; mlat=38.6270; mlong=-90.1994; end;
when (geodist(''latitude''n, ''longitude''n, 39.7684, -86.1581, "M") < 50) do; metro="Indianapolis"; mlat=39.7684; mlong=-86.1581; end;
when (geodist(''latitude''n, ''longitude''n, 39.5299, -119.8143, "M") < 50) do; metro="Reno"; mlat=39.5299; mlong=-119.8143; end; 

otherwise;
end;
/* END data step run */
run;';
if rc.statusCode != 0 then do;
  print "Error executing datastep statement in CASL";
  exit 3;
end;
/* END statement 036623f2_eefe_11e6_bc64_92361f002671            datastep_statement */

  _dp_inputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_inputCaslib="CASUSER(Matt.Pless@sas.com)";

  _dp_outputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_outputCaslib="CASUSER(Matt.Pless@sas.com)";

/* BEGIN statement 036623f2_eefe_11e6_bc64_92361f002671          datastep_statement */
dataStep.runCode result=r status=rc / code='/* BEGIN data step with the output table data */
data "994d6609-b1f5-4397-af52-938b2cebaf5a" (caslib="CASUSER(Matt.Pless@sas.com)" promote="no");
/* Set the input set */
set "994d6609-b1f5-4397-af52-938b2cebaf5a" (caslib="CASUSER(Matt.Pless@sas.com)" );
zip_cleaned = scan(''address''n, -2, ",");
/* END data step run */
run;';
if rc.statusCode != 0 then do;
  print "Error executing datastep statement in CASL";
  exit 3;
end;
/* END statement 036623f2_eefe_11e6_bc64_92361f002671            datastep_statement */

  _dp_inputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_inputCaslib="CASUSER(Matt.Pless@sas.com)";

  _dp_outputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_outputCaslib="CASUSER(Matt.Pless@sas.com)";

/* BEGIN statement 036623f2_eefe_11e6_bc64_92361f002671          datastep_statement */
dataStep.runCode result=r status=rc / code='/* BEGIN data step with the output table data */
data "994d6609-b1f5-4397-af52-938b2cebaf5a" (caslib="CASUSER(Matt.Pless@sas.com)" promote="no");
/* Set the input set */
set "994d6609-b1f5-4397-af52-938b2cebaf5a" (caslib="CASUSER(Matt.Pless@sas.com)" );
state2 = ZIPSTATE(''zip_cleaned''n);
/* END data step run */
run;';
if rc.statusCode != 0 then do;
  print "Error executing datastep statement in CASL";
  exit 3;
end;
/* END statement 036623f2_eefe_11e6_bc64_92361f002671            datastep_statement */

  _dp_inputTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
  _dp_inputCaslib="CASUSER(Matt.Pless@sas.com)";

  _dp_outputTable="YELP_ADDRESSES_CLEANED";
  _dp_outputCaslib="CASUSER(Matt.Pless@sas.com)";

srcCasTable="994d6609-b1f5-4397-af52-938b2cebaf5a";
srcCasLib="CASUSER(Matt.Pless@sas.com)";
tgtCasTable="YELP_ADDRESSES_CLEANED";
tgtCasLib="CASUSER(Matt.Pless@sas.com)";
saveType="sashdat";
tgtCasTableLabel="";
replace=1;
saveToDisk=1;

exists = doesTableExist(tgtCasLib, tgtCasTable);
if (exists !=0) then do;
  if (replace == 0) then do;
    print "Table already exists and replace flag is set to false.";
    exit ({severity=2, reason=5, formatted="Table already exists and replace flag is set to false.", statusCode=9});
  end;
end;

if (saveToDisk == 1) then do;
  /* Save will automatically save as type represented by file ext */
  saveName=tgtCasTable;
  if(saveType != "") then do;
    saveName=tgtCasTable || "." || saveType;
  end;
  table.save result=r status=rc / caslib=tgtCasLib name=saveName replace=replace
    table={
      caslib=srcCasLib
      name=srcCasTable
    };
  if rc.statusCode != 0 then do;
    return rc.statusCode;
  end;
  tgtCasPath=dictionary(r, "name");

  dropTableIfExists(tgtCasLib, tgtCasTable);
  dropTableIfExists(tgtCasLib, tgtCasTable);

  table.loadtable result=r status=rc / caslib=tgtCasLib path=tgtCasPath casout={name=tgtCasTable caslib=tgtCasLib} promote=1;
  if rc.statusCode != 0 then do;
    return rc.statusCode;
  end;
end;

else do;
  dropTableIfExists(tgtCasLib, tgtCasTable);
  dropTableIfExists(tgtCasLib, tgtCasTable);
  table.promote result=r status=rc / caslib=srcCasLib name=srcCasTable target=tgtCasTable targetLib=tgtCasLib;
  if rc.statusCode != 0 then do;
    return rc.statusCode;
  end;
end;


dropTableIfExists("CASUSER(Matt.Pless@sas.com)", "994d6609-b1f5-4397-af52-938b2cebaf5a");

function doesTableExist(casLib, casTable);
  table.tableExists result=r status=rc / caslib=casLib table=casTable;
  tableExists = dictionary(r, "exists");
  return tableExists;
end func;

function dropTableIfExists(casLib,casTable);
  tableExists = doesTableExist(casLib, casTable);
  if tableExists != 0 then do;
    print "Dropping table: "||casLib||"."||casTable;
    table.dropTable result=r status=rc/ caslib=casLib table=casTable quiet=0;
    if rc.statusCode != 0 then do;
      exit();
    end;
  end;
end func;

/* Return list of columns in a table */
function columnList(casLib, casTable);
  table.columnInfo result=collist / table={caslib=casLib,name=casTable};
  ndimen=dim(collist['columninfo']);
  featurelist={};
  do i =  1 to ndimen;
    featurelist[i]=upcase(collist['columninfo'][i][1]);
  end;
  return featurelist;
end func;
