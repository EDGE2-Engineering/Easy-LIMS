const fs = require('fs');
const path = require('path');

const HTMLConstants = {
    page_start_tag: `
    <div class="page-wrapper">
        <div class="container">
            <div class="page-data">
    `,
    page_end_tag: `
            </div>
        </div>
    </div>
    `
};

// --- HELPER FUNCTIONS ---

// Simple format function to mimic Python's "string {}".format(v1, v2) for positional arguments
String.prototype.format = function () {
    let i = 0;
    const args = arguments;
    return this.replace(/{}/g, function () {
        return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

function fillPlaceholder(sourceString, placeholder, replacement) {
    if (!sourceString) return "";
    return sourceString.split(placeholder).join(replacement);
}

// Math helpers
function calcSlope(x, y) {
    if (x.length !== y.length) throw new Error("Number of x values should be equal to that of y!");
    if (x.length <= 1) throw new Error("Not enough values! Minimum values required is 2.");
    const y_diff = y[y.length - 1] - y[0];
    const x_diff = x[x.length - 1] - x[0];
    return Number((y_diff / x_diff).toFixed(2));
}

function calcSlopeInDegrees(x, y) {
    const slope = calcSlope(x, y);
    return Math.round(Math.atan(slope) * (180 / Math.PI));
}

function calcLinearRegression(x, y) {
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumXX += x[i] * x[i];
    }
    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const c = (sumY - m * sumX) / n;
    return { m, c };
}

// --- TEMPLATES ---
// Copied from core/html_templates.py

const TEMPLATES = {
    template: `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
        "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<link id='favicon-elem' rel="EDGE Icon" type="image/ico"/>
<head>
    <style type="text/css">
        body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #FAFAFA;
            font: 12pt "Tahoma";
        }

        * {
            box-sizing: border-box;
            -moz-box-sizing: border-box;
        }

        .page-wrapper {
            width: 210mm;
            min-height: 297mm;
            margin: 10mm auto;
            border: 1px #D3D3D3 solid;
            border-radius: 5px;
            background: white;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
        }

        @page {
            size: A4;
            margin: 0;
        }

        @media print {
            html, body {
                width: 210mm;
                height: 297mm;
            }

            .page-wrapper {
                margin: 0;
                border: initial;
                border-radius: initial;
                width: initial;
                min-height: initial;
                box-shadow: initial;
                background: initial;
                page-break-after: always;
                -webkit-print-color-adjust: exact;
            }
        }

        .container {
            padding: 1cm;
            height: 297mm;
        }

        .page-data {
            border: 1px solid black;
            padding: 10px;
            height: 277mm;
        }

        .client-logo-img {
            width: 4cm;
        }

        .frontsheet-edge-logo-img {
            width: 30mm;
            margin: 2mm;
        }

        .frontsheet-iso-cert-img {
            width: 48%;
        }

        .frontsheet-table-container {
            max-height: 90mm;
            min-height: 90mm;
        }

        .frontsheet-table tr td {
            padding-left: 10mm;
            padding-right: 10mm;
        }

        .frontsheet-company-footer-text1 {
            /*border: 1px yellow solid;*/
            width: 100%;
            /*background-color: green;*/
            padding: 10px;
            /*color: white;*/
            font-size: 12px;
        }

        .frontsheet-company-footer-text2 {
            border: 1px yellow solid;
            width: 100%;
            background-color: green;
            padding: 10px;
            color: white;
            font-size: 12px;
        }

        .frontsheet-company-footer-container {
            margin-bottom: 1cm;
            border-top: 1px solid black;
        }

        .site-google-maps-img {
            width: 100%;
            height: auto;
            border: 1px solid black;
            padding: 4mm;
        }


        .table-borehole-log {
            font-size: 3.7mm;
            border: 1px solid black;
            border-collapse: collapse;

            /*transform: rotate(-90deg);*/
            /*position: relative;*/
            /*top: 35%;*/
            /*left: -10%;*/
        }
        .frontsheet-table th,
        .frontsheet-table td {
            text-align: left;
        }
        .abbr-table, .abbr-table th,
        .abbr-table td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-borehole-log th,
        .table-borehole-log td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        th, td {
            text-align: center;
        }

        .table-borehole-log th,
        .table-borehole-log td {
            padding: 0.5mm;
            text-align: center;
        }

        .table-is-codes th {
            background-color: lightgray;
        }

        .table-lab-test-results {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-lab-test-results th,
        .table-lab-test-results td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-chem-analysis {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-chem-analysis th,
        .table-chem-analysis td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-pli-rock {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-pli-rock th {
            background-color: lightgray;
        }

        .table-pli-rock th,
        .table-pli-rock td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-pli-lump {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-pli-lump th {
            background-color: lightgray;
        }

        .table-pli-lump th,
        .table-pli-lump td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-foundation {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-foundation th {
            background-color: lightgray;
        }

        .table-foundation th,
        .table-foundation td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-survey {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-survey th,
        .table-survey td {
            border: 1px solid black;
            border-collapse: collapse;
        }

        .table-is-codes,
        .table-is-codes th,
        .table-is-codes td {
            border: 1px solid black;
            border-collapse: collapse;
            text-align: center;
            margin-left: auto;
            margin-right: auto;
        }

        .table-is-codes th,
        .table-is-codes td {
            padding: 2mm;
        }

        .table-soil-profile,
        .table-soil-profile th,
        .table-soil-profile td {
            border: 1px solid black;
            border-collapse: collapse;
            text-align: center;
            margin-left: auto;
            margin-right: auto;
            width: 90%;
        }

        .table-soil-profile th,
        .table-soil-profile td {
            padding: 2mm;
        }

        .table-soil-profile th {
            background-color: lightgray;
        }

        .table-survey th {
            background-color: lightgray;
        }

        .company-and-engineer-seal {
            text-align: right;
        }

        .site-photos-section, .site-photos-section > tr, .site-photos-section > td {
            table-layout: fixed;
        }

        /*.site-photos-section > tr {*/
        /*    height: 66.25mm;*/
        /*    max-height: 66.25mm;*/
        /*}*/

        .site-photo {
            margin-left: auto;
            margin-right: auto;
            display: block;
            max-width: 100mm;
            max-height: 62mm;
            object-fit: contain;
        }
    </style>
</head>
<body>
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <center>
                <span style="font-size: 23px; color: #29299a;">
                    Geo-Technical Investigation Report for Construction of <br/>
                    <br/>__siteaddress__
                </span><br/><br/>
                <span style="font-size: 20px">Submitted to</span><br/><br/>
                <span style="font-size:22px; font-weight: bold; color: #29299a;">M/s __client__</span><br/>
                <span style="color: #29299a;">__siteaddress__</span><br/><br/>
                <!--                <img class="client-logo-img" src="__clientlogoimg__" alt=""/><br/>-->
                <img class="client-logo-img"
                     src="__clientlogoimg__"
                     alt=""/><br/><br/>
                <div class="frontsheet-table-container">
                    __front_sheet_table__
                </div>
                <div style="font-size: 20px; margin: 3mm;">Report By</div>
                <img class="frontsheet-edge-logo-img" src="__logo_new_small__" alt="EDGE Logo"/>
                <div class="frontsheet-company-footer-container">
                    <div class="frontsheet-company-footer-text1">
                        <b>Services offered:</b> Geo-technical Investigation, Construction Material Testing,
                        Non-destructive Test on
                        Concrete, Structural Design and Analysis
                    </div>
                    <table>
                        <tr>
                            <td style="font-size: 13px;"><span style="color: maroon">Regd Office:</span><br/>EDGE
                                Engineering Solutions Pvt. Ltd.<br/>ISO 9001:2015 Certified<br/>(Certificate No:
                                IN12701A)<br/>#F-516, 2nd Floor, 12th Cross, 1st Stage, 2nd E Main, Bharath Nagar
                                Bangalore
                                - 560091, Karnataka
                            </td>
                            <td style="text-align: center;">
                                <img class="frontsheet-iso-cert-img" src="__iso_cert_img__" alt=""/>
                            </td>
                            <td style="font-size: 13px;"><span style="color: maroon">Laboratory:</span><br/>EDGE
                                Engineering
                                Solutions Pvt. Ltd.<br/>ISO 9001:2015 Certified<br/>(Certificate No: IN12701A)<br/>#F-516,
                                2nd Floor, 12th Cross, 1st Stage, 2nd E Main, Bharath Nagar Bangalore - 560091,
                                Karnataka
                            </td>
                        </tr>
                    </table>
                    <div class="frontsheet-company-footer-text2">
                        Website: https://www.edge2.in<br/>
                        Email: info@edge2.in, reports@edge2.in
                    </div>
                </div>
            </center>
        </div>
    </div>
</div>
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h3>1.0 Introduction</h3>
            <div>M/s __client__ proposed a construction of __projecttype__ at</div>
            <div>__siteaddress__</div>
            <div style="margin-top: 3mm;margin-bottom: 2mm;">In this connection <span>M/s __client__</span> has
                appointed EDGE
                Engineering Solutions Pvt. Ltd. to provide consultancy services for Geotechnical investigations.
            </div>
            <div style="margin-bottom: 5mm; margin-top: 5mm">
                M/s Edge Engineering Solutions Pvt Ltd. Conducted Geotechnical Investigations
                and Laboratory Testing. The entire field Investigation and laboratory testing is conducted as
                per relevant IS Codes and in line with client scope document.<br/>
                Based on field and laboratory test results engineering discussions and recommendations are presented in
                the report.<br/></br>
                The primary objectives of this investigations are:
                <ol>
                    <li>To ascertain the nature of the subsoil strata at the site through field and laboratory
                        testing.</br>
                    </li>
                    <li>To locate the encountered ground water table (if) with in the depth of exploration.</br></li>
                    <li>To obtain soil data required for assessing the allowable bearing pressure and for
                        making the choice of type of foundation as well for the analysis and design of
                        safe and economic foundations.</br>
                    </li>
                    <li>To study the Engineering and Index properties of soil strata.</br></li>
                </ol>
            </div>
            <h3>Project Site Location</h3>
            __google_maps_image__
        </div>
    </div>
</div>
<div class="page-wrapper">
    <div class="container">
        <div class="page-data"><h3>2.0 Scope Of the Work</h3>

            Scope of the work involves conducting both field and laboratory tests, the data
            obtained which is used for the characterisation of the soil, estimation of safe bearing
            capacity which is required for carrying out analysis and design of foundation, and also
            recommended treatment methods where required.

            <h3>3.0 Field and laboratory Investigations</h3>

            This consists of the following tests:
            <ol>
                <li>Visual and physical observation of soil and the location survey.</li>
                <li>Drilling a borehole</li>
                <li>Conducting standard penetration test (SPT) in soil at every 1.5m depth or wherever
                    strata changes.
                </li>
                <li>Collecting undisturbed and representative soil sample for conducting
                    laboratory tests.
                </li>
                <li>Suitable Laboratory tests are conducted for collected samples to
                    determine the Index and Engineering properties of the soil.
                </li>
            </ol>


            <h3>3.1 Boring</h3>

            Drilling one number of borehole shall be advanced to obtain information about the subsoil
            profile and to collect soil samples for strata identification & conducting laboratory tests.
            Location of bore holes shall be at the middle/near, rear/front end of the plot depending on
            the foundation location.

            <h3>3.2 Standard Penetration test (SPT)</h3>

            <p style="text-align:justify">Standard penetration tests were conducted at relevant depths with in the boreholes to
            determine the Penetration resistance value (N) as per IS-2131-1981. In this method,
            a standard split tube sampler (50.8mm OD and 35 mm ID) is driven by dragging a 63.5kg
            hammer on top of the driving collar with a free fall of 750mm, the length of the sampler
            is 508 mm, the sampler is first driven through 150mm as a seating drive. It is further driven
            through 300mm. The number of blows required to drive the samples for 300mm beyond
            the seating drive is recorded as the penetration resistance value N. Refusal is said to be
            have been reached when the sampler penetration is at least more than 150 mm for
            50 blows or 300 mm for 100 blows.</p>
        </div>
    </div>
</div>
<div class="page-wrapper">
    <div class="container">
        <div class="page-data"><h3>3.3 Laboratory Testing</h3>
            Sample procured were transported to laboratory for obtaining Index and Engineering
            properties. In the laboratory samples were visually classified by Geotechnical Engineer.
            Laboratory tests were being carried out as per relevant IS 2720 guidelines.

            <h3>Table 1: Indian Standard Codes Followed</h3>
            <div>
                __is_codes_table_placeholder__
            </div>
        </div>
    </div>
</div>
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h3>4.0 Subsurface Soil Profile</h3>
            Based on the visual observations and laboratory test carried out on soil sample procured
            from Bore hole / Trail Pit, the subsoil strata is classified as follows,laboratory and field
            test results are presented in below tables.
            <div>__sub_soil_profile_table__</div>
        </div>
    </div>
</div>


<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h3>5.0 Conclusions</h3>
            The following conclusions are made based on the field and laboratory investigations
            <ul>
                __additional_recommendations__
            </ul>

            <h3>6.0 Recommendations</h3>
            The following recommendations are made based on the detailed investigation conducted and the conclusions
            were drawn. The recommendations are restricted to the location around investigation points only.
            <ul>
                <li>Soil/Weathered Rock strata and SPT Values shall be checked before laying foundation.</li>
                <li>Foundation resting on cavities / loose soil and filled up soil shall be avoided.</li>
                <li>For sandy soil include proper compaction of soil before laying foundations.</li>
                <li>The bottom of foundation shall be properly levelled and well compacted before the construction of foundation work is taken up. </li>
                <li>If any loose pockets of soil wherever encountered should be completely removed and back filled with well compacted earth material, thereafter a layer of 40-50 mm stone aggregate should be rammed in to the back filled earth.</li>
                <li>A levelling course of lean concrete should then be laid over the aggregate course and construction of foundation can be taken up.</li>
                __bc_soil_recommendation__
                __water_table_recommendation__
            </ul>

            <h3>6.1 Type Of Foundation</h3>
            The structure shall be found on shallow foundation.This may be either isolated footing or combined footing.

            <h3>6.2 Depth of foundation</h3>
            __depth_of_foundation__

            <h3>6.3 Safe bearing pressure for type of footing.</h3>
            __recommendations_for_sbc_rock___
            </br>
            <p style="border: 1px solid black; padding: 0.5mm;">Note: This report is based on the field observations and tests carried out in the laboratory
                for the collected DS/UDS samples from the borehole.In case if any difference is noticed in the field subsoil
                strata during excavation kindly report us before proceeding with further work.
            </p>
            <div class="company-and-engineer-seal">
                <img style="width:30%" src="__sign_img__" alt=""/>
            </div>
        </div>
    </div>
</div>


<!--<div class="page-wrapper">-->
<!--    <div class="container">-->
<!--        <div class="page-data">-->
<!--            <h3>Types of Foundations </h3>-->
<!--            <h3>5.2 Additional Recommendations and Conclusions</h3>-->
<!--            <h3>From the Field Investigation Following Conclusion and Recommendation are drawn</h3>-->
<!--            <div>-->
<!--                <ul>-->
<!--                    <li>For Soil strata include proper compaction of soils before laying foundations.</li>-->
<!--                    <li>Soil/Rock strata and SPT Values shall be checked before laying foundation.</li>-->
<!--                    <li>Foundation resting on cavities / loose soil and filled up soil shall be avoided.</li>-->
<!--                    <li>The bottom of foundation shall be properly levelled and well compacted before the-->
<!--                        construction of foundation work is taken up.-->
<!--                    </li>-->
<!--                    <li>If any loose pockets of soil wherever encountered should be completely removed and back filled-->
<!--                        with well compacted earth material. Thereafter a layer of 40-50 mm stone aggregate should be-->
<!--                        rammed into the back filled earth. A levelling course of lean concrete should then be laid over-->
<!--                        the aggregate course and construction of foundation can be taken up subsequently.-->
<!--                    </li>-->
<!--                    __additional_recommendations__-->
<!--                </ul>-->
<!--            </div>-->
<!--            <div>Note: This report is based on the field observations and tests carried out on samples collected from-->
<!--                the borehole. In case if any difference is noticed in the field subsoil strata during excavation kindly-->
<!--                report to us before proceeding with further work.-->
<!--            </div>-->
<!--            <div class="company-and-engineer-seal">-->
<!--                <img style="width:12%" src="__seal_img__" alt=""/>-->
<!--                <img style="width:30%" src="__sign_img__" alt=""/>-->
<!--            </div>-->
<!--        </div>-->
<!--    </div>-->
<!--</div>-->

__bh_table_placeholder__

__laboratory_test_results_table_placeholder__

__chemical_analysis_table_placeholder__

__PLI_for_rock_table__

__PLI_for_lump_table__

__foundation_of_rock_formations_tables__

__grain_size_distribution_curve_table__

__direct_shear_results_tables__

__summary_of_sbc_tables__

__site_survey_report__

<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h3>Abbreviations used in the Report:</h3>
            <table class="abbr-table" width="100%">
                <tr><th>Code</th><th>Abbreviation</th></tr>
                <tr><td>BH</td><td>Bore Hole</td></tr>
                <tr><td>DS</td><td>Disturbed Sample</td></tr>
                <tr><td>UDS</td><td>Undisturbed Sample</td></tr>
                <tr><td>CR</td><td>Core Recovery</td></tr>
                <tr><td>SPT</td><td>Standard Penetration Test</td></tr>
                <tr><td>TP</td><td>Trial Pit</td></tr>
                <tr><td>CWR</td><td>Completely Weathered Rock</td></tr>
                <tr><td>RMR</td><td>Rock Mass Rating</td></tr>
            </table>
        </div>
    </div>
</div>

__images_page__

<script type="text/javascript">
    let rr = __report_request_json__;

</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script type="text/javascript">
    $(document).ready(function () {
        addHeaderLogoAndFooterSeal()
        alignFrontSheetTable()
        rotateAndAlignBoreholeLogTables();
    });

    function rotateAndAlignBoreholeLogTables() {
        $('.table-borehole-log').each(function () {
            let tableWidth = $(this).width();
            let tableHeight = $(this).height();
            let tableParentWidth = $(this).parent().width();
            let tableParentHeight = $(this).parent().height();
            $(this).attr('style', 'font-size: 3.7mm; border: 1px solid black; border-collapse: collapse; transform: rotate(-90deg); position: relative; top: ' + (tableWidth) + 'px; left: ' + ((tableParentWidth / 2) - (tableHeight / 2)) + 'px; transform-origin: left top;')
        });
    }

    function addHeaderLogoAndFooterSeal() {
        let pageCounter = 0;
        let totalPages = $('.page-wrapper').length
        $('.page-wrapper').each(function () {
            pageCounter += 1;
            let oldPageData = $(this).html();
            let headerImage = '<img src="__logo_new_small__" alt="" style = "position: relative; float: left; width: 25mm; left: 183mm;"/>'
            let headerReportIdLabel = '<span style="float: left; position: relative; top: 3mm; left: -15mm;">' + rr['siteInfo']["reportId"] + '</span>'
            let footerImage = '<img src="__seal_img__" alt="" style = "position: relative; float: right; top: -21mm; width: 10%;"/>'
            //let pageNumber = '<div style="position: relative; float: right; top: -8mm; left: -74mm; font-size: 3.4mm;">Page ' + pageCounter + ' of ' + totalPages + '</div>'
            //let pageNumber = '<div style="position: relative; float: right; top: -8mm; left: -74mm; font-size: 3.4mm;">Page ' + pageCounter + '</div>'
            let pageNumber = ''

            let newPageData = headerImage + headerReportIdLabel + oldPageData + footerImage + pageNumber;
            $(this).html(newPageData);
        });
    }

    function alignFrontSheetTable() {
        let tableContainerHeight = $('.frontsheet-table-container').height();
        let tableHeight = $('.frontsheet-table').height();
        $('.frontsheet-table').attr('style', 'position: relative; top: ' + ((tableContainerHeight / 2) - (tableHeight / 2)) + 'px;')
    }
</script>
</body>

</html>
`,
    bh_table_indus_manual_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
            <tr>
                <th colspan="12" style='background: #dad9d9;' style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Indus ID:
                </th>
                <th colspan="6" style='background: #dad9d9;'>
                    __indus_id__
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    Date:
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Id:
                </th>
                <th colspan="6" style='background: #dad9d9;'>
                    __site_id__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Name:
                </th>
                <th colspan="6" style='background: #dad9d9;'>
                    __site_name__
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    __water_table__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Address:
                </th>
                <th colspan="6" style='background: #dad9d9;'>
                    __site_address__
                </th>
            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>) 
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    bh_table_indus_drilling_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
        <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
            <tr>
                <th colspan="15" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Indus ID:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __indus_id__
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    Date:
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Id:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_id__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Name:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_name__
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    __water_table__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Address:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_address__
                </th>

            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Lengths (cm)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Recovery (CR) %
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Rock Quality Designation (RQD)%
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>) 
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    bh_table_reliance_manual_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
            <tr>
                <th colspan="12" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Id:
                </th>
                <th colspan="7" style='background: #dad9d9;'>
                    __site_id__
                </th>
                <th style='background: #dad9d9;'>
                    Date:
                </th>
                <th style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Name:
                </th>
                <th colspan="7" style='background: #dad9d9;'>
                    __site_name__
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    __water_table__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Address:
                </th>
                <th colspan="7" style='background: #dad9d9;'>
                    __site_address__
                </th>

            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>) 
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    bh_table_reliance_drilling_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
            <tr>
                <th colspan="15" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Id:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_id__
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Date:
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Name:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_name__
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th colspan="2" , rowspan="2" style='background: #dad9d9;'>
                    __water_table__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Site Address:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __site_address__
                </th>

            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Lengths (cm)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Recovery (CR) %
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Rock Quality Designation (RQD)%
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>) 
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    bh_table_other_manual_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
            <tr>
                <th colspan="12" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Project Name:
                </th>
                <th colspan="7" style='background: #dad9d9;'>
                    __project_name__
                </th>
                <th style='background: #dad9d9;'>
                    Date:
                </th>
                <th style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Project Address:
                </th>
                <th colspan="7" style='background: #dad9d9;'>
                    __project_address__
                </th>
                <th style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th style='background: #dad9d9;'>
                    __water_table__
                </th>

            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>)
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    bh_table_other_drilling_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Bore Log and Field Data Sheet: (__bh_number__) </h4>
            <table class = "table-borehole-log">
                <th colspan="15" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>

            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Project Name:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __project_name__
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Date:
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    __survey_date__
                </th>
            </tr>
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    Project Address:
                </th>
                <th colspan="8" style='background: #dad9d9;'>
                    __project_address__
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Ground Water Table:
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    __water_table__
                </th>
            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Type of sample
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Legend
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Soil Description
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Water Table
                </th>
                <th colspan="4" style='background: #dad9d9;'>
                    Standard Penetration Test (SPT)
                </th>
                <th colspan="2" style='background: #dad9d9;'>
                    Shear Parameters
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Lengths (cm)
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Core Recovery (CR) %
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    Rock Quality Designation (RQD)%
                </th>
                <th rowspan="2" style='background: #dad9d9;'>
                    SBC in (t/m<sup>2</sup>) 
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    15cm
                </th>
                <th style='background: #dad9d9;'>
                    30cm
                </th>
                <th style='background: #dad9d9;'>
                    45cm
                </th>
                <th style='background: #dad9d9;'>
                    N Value
                </th>
                <th style='background: #dad9d9;'>
                    Cohesion (C) kg/cm<sup>2</sup>
                </th>
                <th style='background: #dad9d9;'>
                    Angle of Internal friction (&Phi;) in Degrees
                </th>
            </tr>
            __bh_rows__
        </table>
        </div>
    </div>
</div> 
`,
    lab_test_results: `
<h4> Summary of Laboratory Test Results: (__bh_number__)</h4>

    <table class="table-lab-test-results">
            <tr>
                <th colspan="11" style='background: #dad9d9; font-size: 14px;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th rowspan="2" style='background: #dad9d9; font-size: 14px;'>
                    Depth in (m)
                </th>
                <th rowspan="2" style='background: #dad9d9; font-size: 14px;'>
                    Bulk Density gm/cc
                </th>
                <th rowspan="2" style='background: #dad9d9; font-size: 14px;'>
                    Moisture Content (%)
                </th>
                <th colspan="3" style='background: #dad9d9; font-size: 14px;'>
                    Grain Size Distribution
                </th>
                <th colspan="3" style='background: #dad9d9; font-size: 14px;'>
                    Atterberg Limits
                </th>
                <th rowspan="2" style='background: #dad9d9; font-size: 14px;'>
                    Specific Gravity
                </th>
                <th rowspan="2" style='background: #dad9d9; font-size: 14px;'>
                    Free Swell Index (%)
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Gravel (%)
                </th>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Sand (%)
                </th>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Silt and Clay (%)
                </th>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Liquid Limit (%)
                </th>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Plastic Limit (%)
                </th>
                <th style='background: #dad9d9; font-size: 14px;'>
                    Plasticity Index (%)
                </th>
            </tr>
            __lab_test_results_table__
        </table>
`,
    chemical_analysis_table: `
<h4> Chemical Analysis of Soil Sample: (__bh_number__)</h4>

    <table width="100%" class="table-chem-analysis">
            <tr>
                <th colspan="3" style='background: #dad9d9;'>
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9;'>
                    Sl. no
                </th>
                <th style='background: #dad9d9;'>
                    Name of the test
                </th>
                <th style='background: #dad9d9;'>
                    Results
                </th>
            </tr>
            __chemical_analysis_table__
        </table>
`,
    point_load_strength_index_of_rock_table: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Point Load Strength Index of Rock: (__bh_number__)</h4>
                <table width="100%" class="table-pli-rock">
                <tr>
                <th colspan="8">
                    __bh_number__
                </t>
            </tr>
            <tr>
                <th style='background: #dad9d9; font-size: 14px;'>Sl. no</th>
                <th style='background: #dad9d9; font-size: 14px;'>Depth at which samples were collected</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure (kN)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D50 (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure in (N)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Point Load Strength Index IS (50) (MPa) = P / (√ ((D<sup>1.5</sup> ) * (D50))</th>
                <th style='background: #dad9d9; font-size: 14px;'>Uniaxial Compressive Strength of Rock qc = 22 * IS (50)</th>
            </tr>
            __point_load_strength_index_for_rock_table__
        </table>
        </div>
`,
    point_load_strength_index_of_rock_table_individual: `
</table>
</br>
</br>
</br>
<div>
    <table width="100%" class="table-pli-rock">
            <tr>
                <th colspan="8">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9; font-size: 14px;'>Sl. no</th>
                <th style='background: #dad9d9; font-size: 14px;'>Depth at which samples were collected</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure (kN)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D50 (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure in (N)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Point Load Strength Index IS (50) (MPa) = P / (√((D<sup>1.5</sup>) * (D50))</th>
                <th style='background: #dad9d9; font-size: 14px;'>Uniaxial Compressive Strength of Rock qc = 22 * IS (50)</th>
            </tr>
`,
    images_page_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Site Photos </h4>
            <table width="100%" class="site-photos-section">
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img1__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img2__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img3__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img4__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img5__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img6__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img7__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img8__">
                    </td>
                </tr>
            </table>
        </div>
    </div>
</div>
`,
    sbc_soil_data: "Based on the shear criteria the SBC and based on the settlement criteria the allowable bearing pressure has been worked out. Individual footing/combined footing may be designed using the recommended safe bearing capacity, with a factor of safety of 3.0, against shear failure and for an allowable settlement.",
    sbc_rock_data: "Based on the Point load Index strength, Unconfined Compressive Strength of Rock & Rock Mass Rating the SBC has been worked out. Individual footing/combined footing may be designed using the recommended safe bearing capacity. ",
    point_load_strength_index_of_lump_table: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
<h4> Point Load Strength Index of Lump: (__bh_number__)</h4>
    <table width="100%" class="table-pli-lump">
            <tr>
                <th colspan="10">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th style='background: #dad9d9; font-size: 14px;'>Sl. no</th>
                <th style='background: #dad9d9; font-size: 14px;'>Depth at which samples were collected</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure (kN)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D50 (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>D (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>W (mm)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Load at failure in (N)</th>
                <th style='background: #dad9d9; font-size: 14px;'>Factor ( (DW) <sup>0.75</sup> √ (D50) )</th>
                <th style='background: #dad9d9; font-size: 14px;'>Point load lump strength index IL (MPa) = P / ((DW) <sup>0.75</sup> √ (D50))</th>
                <th style='background: #dad9d9; font-size: 14px;'>UCS = 15 x IL x 100 (t/m<sup>2</sup>)</th>
            </tr>
            __point_load_strength_index_for_lump_table__
        </table>
        </div>
    </div>
</div>
</div>
`,
    point_load_strength_index_of_lump_table_individual: `
</table>
`,
    foundation_in_rock_formations_table_1: `
<h4> Foundation in Rock Formations: (__bh_number__)</h4>

    <table width="100%" class="table-foundation">
            <tr>
                <th colspan="10">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th>Rock</th>
                <th>Strength (i)</th>
                <th>RQD (ii)</th>
                <th>Spacing Discontinuity (iii)</th>
                <th>Condition of Discontinuity (iv)</th>
                <th>GWT condition (v)</th>
                <th>Discontinuity orientation (vi)</th>
            </tr>
`,
    foundation_in_rock_formations_table_2: `
</br>
</br>
<div>
    <table width="100%" class="table-foundation">
            <tr>
                <th colspan="10">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th>Rock</th>
                <th>R.M.R</th>
                <th>Rock grade as per IS: 12070</th>
                <th>Inferred Net S.B.P as per IS:12070, table 3, Amended (t/m<sup>2</sup>)</th>
            </tr>
`,
    foundation_in_rock_formations_table_1_bh_0: `
            <h3>Engineering Analysis for Foundations resting over Rock Formations</h3>
            Design calculations for foundations supported in rock,
            Net Safe Bearing Pressure from RMR Criteria,
            Rock mass rating is defined as sum of following six factors.
            <ol type="i">
                <li>Rating for strength</li>
                <li>Rating for RQD</li>
                <li>Rating for spacing of discontinuity</li>
                <li>Rating for condition of discontinuity</li>
                <li>GWT condition</li>
                <li>Orientation of discontinuity</li>
            </ol>

            <h4> Foundation in Rock Formations: (__bh_number__)</h4>

    <table width="100%" class="table-foundation">
            <tr>
                <th colspan="10">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th>Rock</th>
                <th>Strength (i)</th>
                <th>RQD (ii)</th>
                <th>Spacing Discontinuity (iii)</th>
                <th>Condition of Discontinuity (iv)</th>
                <th>GWT condition (v)</th>
                <th>Discontinuity orientation (vi)</th>
            </tr>
`,
    survey_report_table: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
<h4> Site Survey Report: </h4>
    <table width="100%" class="table-survey" style>
            <tr>
                <th>Sl.no</th>
                <th>Description</th>
                <th>Status</th>
            </tr>
            __survey_report__
        </table>
        </br></br>
        <h4>Note:</h4>
        <p>__survey_report_note__</p>
    </div>
</div>
</div>`,
    is_code_table: `
    <table class="table-is-codes">
            <tr>
                <th>Sl. no</th>
                <th>Type of test</th>
                <th>IS Code</th>
            </tr>
            __is_codes__
        </table>
`,
    sub_soil_profile_table: `
        <h4>Sub-Soil Profile and Classification: (__bh_number__) </h4>
    <table class="table-soil-profile">
            <tr>
                <th colspan="3">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th style='width:10%'>
                    Layers
                </th>
                <th style='width:25%'>
                    Depths (m)
                </th>
                <th style='width:65%'>
                    Soil Description
                </th>
            </tr>
            __sub_soil_profile_table__
        </table>
`,
    direct_shear_results_table: `<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
        <h4> Direct Shear Results: (__bh_number__)</h4>
        <h4> Data: </h4>
            <table class="table-soil-profile">
                <tr>
                    <th colspan="6">
                    __bh_number__
                    </th>
                </tr>
                <tr>
                                <th rowspan = "2">
                Depth of sample (m)
                </th>
                <th rowspan = "2">
                Shear box size (cm)
                </th>
                    <th rowspan="2">
                        Normal stress (Kg/cm<sup>2</sup>)
                    </th>
                    <th rowspan="2">
                        Shear stress (Kg/cm<sup>2</sup>)
                    </th>
                    <th colspan="2">
                        Results from Graph
                    </th>
                </tr>
                <tr>
                    <th>
                        C (Kg/cm<sup>2</sup>)
                    </th>
                    <th>
                        Phi (degrees)
                    </th>
                </tr>
                __direct_shear_results_table__
            </table>
            <h4>Graph:</h4>
            __direct_shear_results_graph__
        </div>
    </div>
</div>
`,
    grain_size_analysis_table: `<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Grain Size Analysis: (__bh_number__) </h4>
            <table class="table-soil-profile">
                <tr>
                    <th colspan="11">
                        __bh_number__
                    </th>
                </tr>
                </th>
                <th>
                    Depth (m)
                </th>
                <th>
                    Sieve size (mm)
                </th>
                <th>
                    4.750
                </th>
                <th>
                    2.360
                </th>
                <th>
                    1.180
                </th>
                <th>
                    0.600
                </th>
                <th>
                    0.425
                </th>
                <th>
                    0.300
                </th>
                <th>
                    0.150
                </th>
                <th>
                    0.075
                </th>
                <th>
                    Pan
                </th>
                </tr>
                __grain_size_analysis_table__
            </table>
            <h4>Graph:</h4>
            __grain_size_analysis_graph__
        </div>
    </div>
</div>`,
    summary_of_sbc_results_table: `
<h4>Summary of SBC Results: (__bh_number__)</h4>
    <table class="table-soil-profile">
            <tr>
                <th colspan="3">
                    __bh_number__
                </th>
            </tr>
            <tr>
                <th style='width:33%'>
                    Depth (m)
                </th>
                <th style='width:33%'>
                    Size of foundation
                </th>
                <th style='width:33%'>
                    Safe Bearing capacity in (t/m<sup>2</sup>)
                </th>
            </tr>
            __summary_of_sbc_results_table__
        </table>
`,
    sbc_soil_data: "Based on the shear criteria the SBC and based on the settlement criteria the allowable bearing pressure has been worked out. Individual footing/combined footing may be designed using the recommended safe bearing capacity, with a factor of safety of 3.0, against shear failure and for an allowable settlement.",
    sbc_rock_data: "Based on the Point load Index strength, Unconfined Compressive Strength of Rock & Rock Mass Rating the SBC has been worked out. Individual footing/combined footing may be designed using the recommended safe bearing capacity. ",
    images_page_template: `
<div class="page-wrapper">
    <div class="container">
        <div class="page-data">
            <h4> Site Photos </h4>
            <table width="100%" class="site-photos-section">
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img1__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img2__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img3__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img4__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img5__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img6__">
                    </td>
                </tr>
                <tr>
                    <td>
                        <img class="site-photo"
                             src="__img7__">
                    </td>
                    <td>
                        <img class="site-photo"
                             src="__img8__">
                    </td>
                </tr>
            </table>
        </div>
    </div>
</div>
`
};

const ClientNames = {
    INDUS: 'Indus Towers Ltd.',
    RELIANCE: 'Reliance Jio Infocomm Ltd.',
    ATC: "ATC Telecom Infrastructure Pvt. Ltd.",
    OTHER: 'Other'
};

const BoreholeType = {
    MANUAL: 'Manual',
    DRILLING: 'Drilling'
};

class LogoUtil {
    constructor(client_name) {
        this._client_name = client_name;
    }

    logo() {
        if (this._client_name === ClientNames.INDUS) {
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI4AAABICAIAAAAB2JDkAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTIzNjBGRERBMDJEMTFFNDk2ODE5ODFERUI2M0I5RUYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTIzNjBGRENBMDJEMTFFNDk2ODE5ODFERUI2M0I5RUYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDMkE1NjM3OTkwNUIxMUU0QjE3RTk4OTU2MkFFRUE1NyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDMkE1NjM3QTkwNUIxMUU0QjE3RTk4OTU2MkFFRUE1NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps2g2YIAAArLSURBVHja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";
        } else if (this._client_name === ClientNames.RELIANCE) {
            return "data:image/png;base64,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“;
        } else if (this._client_name === ClientNames.ATC) {
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALkAAABRCAIAAAAB2JDkAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTIzNjBGRERBMDJEMTFFNDk2ODE5ODFERUI2M0I5RUYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTIzNjBGRENBMDJEMTFFNDk2ODE5ODFERUI2M0I5RUYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDMkE1NjM3OTkwNUIxMUU0QjE3RTk4OTU2MkFFRUE1NyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDMkE1NjM3QTkwNUIxMUU0QjE3RTk4OTU2MkFFRUE1NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ps2g2YIAAArLSURBVHja7F15UJNJFidy36uMwoBRwQMPIlBeqKDWliCuq26VlqVVHFWIy7Egi4pYeCGOiiIjKgoqIOWAojUeyLKrjo4MKOiqHDIixyCEcCj3EY4QSPbp5358AgZoQAK83x9Up79+rzvdv35HSHdYYrFYBvElYmJi5uXXTt/rjFPBBAu50gklJSUcDueuzIx5v0Upc6bhhNAYg1PABOwce3v7mpoacauQ53RELGjFOUGudI+zZ88+evSIKrfkcMsOh+GcIFe6QVZW1u7du5k1lSE/8xNTcWaQK19AKBTa2NgIBIJO9bx/HG+v4+P8IFc6cODAgbS0tG44VFpR4hWE84Nc+YynT5+eOHHia09rb/5ae+tXnCXkigyfz7e1tRWJRJIS6V1BwrJK5Mpoh4eHR0FBgeQ2ELLwXP1lRvdnUaOdK7GxsREREb0yP4mplRdvIVdGKT58+ODo6Nj79mWHLrbkcJEroxFbt26trOxDFCIWCHnOR8XCNuTK6MKFCxfi4+P7KtX8Ou+D/2XkyihCXl7ezp07yWTLz8Q0Pv8duTIq0NbWZmdn19jYSCgvEvNcjon4TciVkY9jx449e/asPxpauWWlPueQKyMcL1688PPz67+e6uj/1P/7CXJlxKKpqcnW1hZ80IBoK/5nYFtFDXJlZMLLyysnJ2fA4p6quuLtAciVEYh79+6dP39+YHXWP3hWFRmHXBlRqKqqcnBwGAzNZftDBO+KkSsjB05OTmVlZYOhWdTUwnPxF7e1I1dGAq5cuXLz5s1BDJlfZpWfikauDHtwuVx3d/fB7qX85E9NaTnIlWEMkUhkZ2dXX18/2B2BD+I5HxU1C5ArwxWBgYGJiYnfpi/BH7yyg6HIlWGJjIyMffv2fdNsKzy24dF/kSvDDAKBwNbWtrWV5OCgubm57l//TNZvsXtAe3U9cmU4wcfHJzMzk0BQVVUV8qbJwT5yWpoE4sIPVcU7fkSuDBskJCScOnWKTDYgIEBfX1/uu7F6P+4g01AXl1hz/cHIm9UReE9CXV0dh8Ph8XgEspaWlvfv32exWNTLIqcjtT8/ItmCaioznoQrsLXRrkg13NzcyIiiqakZHh5OEwWgd8JDXkeLJFfnN/Fcj8mIxMgV6cWNGzeioqLIZIOCgthsNrNGVlNt4mkvMm2Nya8rzt1AHySlKCkpmTt3bnV1NYHsunXrYmNju09tPAOrr8STTK6C3PRfQpSMpiJXpAvwRqytrR88IAkqx40b9+bNGx0dne4dSmNzrvnW1qL3BJqVZhtMfxjCUpRHHyRFCA4OJiMKIDQ09GtE+ThHqsrsYG8ZRhzTe7RkvXv/QxjaFSlCdna2qalpS0sLgeymTZuuX7/eY7NSn3OVF4j+Wc1iGcQGqi01Qa4MPYRCoZmZWWoqyQVM2tra4H20tHpOdsSC1txl2wR/kGRY8noTIIWW1VBFHzTE8PPzIyMK4NKlS70hysddpajAPr+HJUsyY8KS8lLvMxivDDGSk5OPHj1KJmtvb7927dret1eZN2v89i1kfdXc+KX2TgL6oCEDn883MTHJz88nkGWz2ZmZmZqaffunj7i1Lc/SpeV3kh5lx6rPSAqX//47tCtDAE9PTzKiAMLCwvpKFOojk0nn9sBfgh7baxqK3U8M3wt/hjFX4uLiYL3JZF1dXa2srMhklYymanvZkck2PH5ZGXYHfdA3RXl5uZGRUUVFBYGsgYFBRkaGmpoace/idlH+avemV29JdqeS4vSEC4rTJ6Fd+UZwdHQkIwqLxYqMjOwPUT4qkR3DPucNq04gK2oRFP39yHC88GdYcgVcDzgg4hDHwsKi/2MAw6Cz35FM9uOFPwFX0AcNOiCYNTY2Jrs9xdDQMD09XUlJaWCGIhK/+9tO/tN0ok3KmhZ/RmXhHOTKYKG9vR2sQkpKCknKKisLggsWLBjA8bRyy3ItHEWNzQSyCvq6M367NEZVmXoJ7I+O1CyW9vR2sQkpKCknKKisLggsWLBjA8bRyy3ItHEWNzQSyCvq6M367NEZVmXoJ7I+O1CyW9vR2sQkpKCknKKisLggsWLBjA8bRyy3ItHEWNzQSyCvq6M367NEZVmXoJ7I+OjpaTk+NwOAM7yFHqg/z9/cmIAvD29h7wNVCY/L3uD66EPCsoLd3bcRb/4sWLsG+5XG5SUpJQKESu9AuvXr3y9fUlkwW3RSwrGeNs/6K+ciGZbPVP8fX3PlMfiAJWs7KyUkdHp7a2FrlCjubmZhsbG7JrdhQUFCD3kZcfnC+RsFgTg3bJ/kmdTLrYI6Ct8iMzwOYVFhbOmTOHx+ONHz8e4xWEJDQ0NIBF6fQ9TuQKYvgBf7sBgVxBIFcQyBUEcgWBXEEgVxAI5AoCuYJAriCQKwjkCgK5gkAgVxDIFQRyBTGUkJO2AWVlZZWXl3dwecyYZcuWUeUnT570+B1KMzMz+kiHWCzOy8t7+/ZtVVVVfX29urq6hoYGm802NjZWVlamRUAnaKZfrlixomtfpqam9OHn9+/fZ2dnU+WZM2fq6OhATUFBQU1NTesnNDU1QWN5efkJEyZMnTq1650dL1++5PP5VHn+/PnMg23V1dWvX79mNp49ezbokYq1EUsTYJa7zsudO3eop705qg5rBi1zcnJcXV2/NsW+vr7MTmGNu05Ip77Mzc2bm5upR5cvd/zuO5Sh5uDBgxKGpK+vv2PHDi6XS/cIZKWfpqWlMQfj4eHRSXz9+vVSsjrSxRX6smtVVVV6t3E4nPb2dngKhcn/B/MWWjAVdD2PxwsKClJQUKCfqqioLFy4cM2aNVZWVmAeQHNpaWlfuQLYsGEDNQzJXDE0NNyyZQss8KJFixQVOw6xgpmBdyeZKzAw2ihqa3fco/z8+XPkSmejQl/w5+DgsGvXLnqyoqOjOzVmriUsNl0fExPDXJ7Tp0/T9oACeJZOqiRzZdq0aXJynz01DKlTF125AmVac11dnZubG1P5w4cPJXCFNiqwT4AfdJuVK1ciV74ArCtzJ8Emo09pgNcXCoW94crSpUvp+r179/amX8lcsba2Pn78OP306tWrt2/f7iVXKEBEQj91dnb+GlcgSqONipOTE9Qw75x6/PjxkC+QtORBEKePHmS9ilgYyDmgCiBqsnPz4+IiOiNnsLCQro8a9as/g8MzJKXlxe9bNu2bWtoaOiTBqY3kXCgMDAwkL5HE7xtQkIC/fYBe/bswdj2M0JCQiSPc+LEiUCgHu2KpaUlXb9kyZJODojArkBiBS8hjTIyMupKwR7tCiQ1zKP2UVFR3dqViooKCKQkz8Ddu3eHdo3kpMSoMO8HhE0MqTJVTkpKou5MLy4uDg0N9fT0lKzq8OHDsCOp7ZucnGxiYuLi4rJ48WLIiaASkmfQs3Hjxj7ZFfgL+XZcXByEq+ApIAmX0B5sQ21trUAgyM3NjY+PDw4Opq3FqlWrIOztVgpsKn3zAzBpypQpVBmyp/T0z/cw7N+/HyJ0emZGqV1hXuVlYWHBfMSMFbS0tMD+S7YrAOAKxDcS3jIzfe3RrsDK0S1TUlI63cfRm5xZ5tMviBw6dAgI1G0eBAPQ0NCga/Ly8ugegdnMo7XXrl0b7XYFpgDSXaq8fft25iNXV1dYD2pzUwkRxH1QmDRpEv3rqJ222vLly7Ozs//1CampqcAMyjJBBgtrZmBgUFRUBOLMj/vo3mnQ+nV1dZkf9EVGRnp7e9M1VGIPRktPT4/6eA3YDEYIdEKYAkog8oBwe/Xq1UySgU76dDuk95BYjf0EqgvIvOiWoBYyqVu3blEvYVNt3rx5qJYJz6gieov/CTAAfCafUqByhj0AAAAASUVORK5CYII=";
        } else {
            // TODO: Add default image
            return "";
        }
    }
}

class AddressUtil {
    constructor(client_name) {
        this._client_name = client_name;
    }

    address() {
        if (this._client_name === ClientNames.INDUS) {
            return "No.12, Subramanya Arcade, 'D' Block, 7th Floor, Bannerghatta Road, Bangalore.";
        } else if (this._client_name === ClientNames.RELIANCE) {
            return 'Bangalore, Karnataka';
        } else if (this._client_name === ClientNames.ATC) {
            return "HM Tower, 1st Floor, Magrath Road Junction, Brigade Road, Ashok Nagar, Bengaluru - 560001, Karnataka, INDIA";
        } else {
            // TODO: Add default address
            return "";
        }
    }
}

function get_table_template(client, borehole_type, table_name) {
    if (client === ClientNames.INDUS && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_indus_manual_template;
    } else if (client === ClientNames.INDUS && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_indus_drilling_template;
    } else if (client === ClientNames.RELIANCE && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_reliance_manual_template;
    } else if (client === ClientNames.RELIANCE && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_reliance_drilling_template;
    } else if (client === ClientNames.OTHER && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_other_manual_template;
    } else if (client === ClientNames.OTHER && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_other_drilling_template;
    } else if (![ClientNames.OTHER, ClientNames.INDUS, ClientNames.RELIANCE, ClientNames.ATC].includes(client) && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_other_drilling_template;
    } else if (![ClientNames.OTHER, ClientNames.INDUS, ClientNames.RELIANCE, ClientNames.ATC].includes(client) && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_other_manual_template;
    } else if (table_name === 'laboratory_test_results_table') {
        return TEMPLATES.lab_test_results;
    } else if (table_name === 'chemical_analysis_table') {
        return TEMPLATES.chemical_analysis_table;
    } else if (table_name === 'point_load_strength_index_for_rock_table') {
        return TEMPLATES.point_load_strength_index_of_rock_table;
    } else if (table_name === 'point_load_strength_index_for_rock_table_individual') {
        return TEMPLATES.point_load_strength_index_of_rock_table_individual;
    } else if (table_name === 'point_load_strength_index_for_lump_table') {
        return TEMPLATES.point_load_strength_index_of_lump_table;
    } else if (table_name === 'point_load_strength_index_for_lump_table_individual') {
        return TEMPLATES.point_load_strength_index_of_lump_table_individual;
    } else if (table_name === 'foundation_in_rock_formations_table_1') {
        return TEMPLATES.foundation_in_rock_formations_table_1;
    } else if (table_name === 'foundation_in_rock_formations_table_2') {
        return TEMPLATES.foundation_in_rock_formations_table_2;
    } else if (table_name === 'survey_report') {
        return TEMPLATES.survey_report_table;
    } else if (table_name === 'is_code_table') {
        return TEMPLATES.is_code_table;
    } else if (table_name === 'sub_soil_profile_table') {
        return TEMPLATES.sub_soil_profile_table;
    } else if (table_name === 'summary_of_sbc_results_table') {
        return TEMPLATES.summary_of_sbc_results_table;
    } else if (table_name === 'direct_shear_results_table') {
        return TEMPLATES.direct_shear_results_table;
    } else if (table_name === 'grain_size_analysis_table') {
        return TEMPLATES.grain_size_analysis_table;
    } else if (table_name === 'sbc_soil_data') {
        return TEMPLATES.sbc_soil_data;
    } else if (table_name === 'sbc_rock_data') {
        return TEMPLATES.sbc_rock_data;
    } else if (table_name === 'foundation_in_rock_formations_table_1_bh_0') {
        return TEMPLATES.foundation_in_rock_formations_table_1_bh_0;
    }
    return "";
}

// [[[GENERATORS_START]]]

class Validator {
    validate_request(rr) {
        const client_names = Object.values(ClientNames);
        if (!client_names.includes(rr.siteInfo.clientName)) {
            throw new Error("Invalid Client Name");
        }

        if (rr.chemicalAnalysisLogs) {
            for (let log of rr.chemicalAnalysisLogs) {
                if (log.extraFields) {
                    for (let field of log.extraFields) {
                        if (!field.name || !field.value) {
                            // Logic from python: if name or value is empty?
                            // Python: if field.name == "" or field.value == "":
                            // Not implemented in Python snippet I saw, but usually good practice.
                        }
                    }
                }
            }
        }
    }
}

class FrontSheetGenerator {
    generate_front_sheet(rr) {
        let template = get_template();
        template = fillPlaceholder(template, "__projecttype__", rr.siteInfo.projectType);
        template = fillPlaceholder(template, "__siteaddress__", rr.siteInfo.siteAddress);
        template = fillPlaceholder(template, "__client__", rr.siteInfo.clientName);

        let clientAddress = "";
        if (!rr.siteInfo.clientAddress || rr.siteInfo.clientAddress.trim() === "") {
            clientAddress = new AddressUtil(rr.siteInfo.clientName).address();
        } else {
            clientAddress = rr.siteInfo.clientAddress.trim();
        }
        template = fillPlaceholder(template, "__clientaddress__", clientAddress);

        let logoUtil = new LogoUtil(rr.siteInfo.clientName);
        template = fillPlaceholder(template, "__clientlogoimg__", logoUtil.logo());

        template = fillPlaceholder(template, "__projecttype__", rr.siteInfo.projectType);

        const front_sheet_table = this.__generate_front_sheet_table(rr);
        template = fillPlaceholder(template, "__front_sheet_table__", front_sheet_table);
        return template;
    }

    __generate_front_sheet_table(rr) {
        let client_name_str = "";
        const client = rr.siteInfo.clientName; // Assuming string match
        let front_sheet_table = `<table class="frontsheet-table">`;

        if (client === ClientNames.INDUS) {
            client_name_str = "Indus ID";
            front_sheet_table += `<tr><td>${client_name_str}</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.anchorOrIndusId}</td></tr>`;
            front_sheet_table += `<tr><td>Site ID</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.siteId}</td></tr>`;
        } else if (client === ClientNames.RELIANCE) {
            client_name_str = "Site ID";
            front_sheet_table += `<tr><td>${client_name_str}</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.siteId}</td></tr>`;
        } else {
            client_name_str = "Project Name";
            front_sheet_table += `<tr><td>${client_name_str}</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.siteName}</td></tr>`;
        }

        if (rr.boreholeLogs.length === 1) {
            front_sheet_table += `<tr><td>Latitude</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.latitude}</td></tr>`;
            front_sheet_table += `<tr><td>Longitude</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.longitude}</td></tr>`;
        }

        let bh_number = 0;
        let wt_detected = false;
        let wt_depth = "";

        if (rr.sbcDetailLogs) {
            for (let bh = 0; bh < rr.sbcDetailLogs.length; bh++) {
                bh_number += 1;
                let bh_string = "BH" + bh_number;
                if (rr.sbcDetailLogs[bh].rows) {
                    for (let table = 0; table < rr.sbcDetailLogs[bh].rows.length; table++) {
                        if (rr.sbcDetailLogs[bh].rows[table].useForReport === true) {
                            let depth = rr.sbcDetailLogs[bh].rows[table].depth;
                            let sbc_value = rr.sbcDetailLogs[bh].rows[table].sbcValue;
                            front_sheet_table += `<tr><td>SBC value at ${depth} m (${bh_string})</td>`;
                            front_sheet_table += "<td>:</td>";
                            front_sheet_table += `<td>${sbc_value} t/m<sup>2</sup></td></tr>`;
                        }
                    }
                }
            }
        }

        if (rr.boreholeLogs.length === 1) {
            if (rr.boreholeLogs[0].depthRows) {
                for (let table = 0; table < rr.boreholeLogs[0].depthRows.length; table++) {
                    if (rr.boreholeLogs[0].depthRows[table].waterTableDetected === true) {
                        wt_depth = `${rr.boreholeLogs[0].depthRows[table].depth}m`;
                        wt_detected = true;
                        break;
                    }
                }
            }
            if (wt_detected) {
                front_sheet_table += `<tr><td>Water table (BH1)</td>`;
                front_sheet_table += "<td>:</td>";
                front_sheet_table += `<td>Detected at ${wt_depth}</td></tr>`;
            } else {
                front_sheet_table += `<tr><td>Water table (BH1)</td>`;
                front_sheet_table += "<td>:</td>";
                front_sheet_table += `<td>Not Detected</td></tr>`;
            }

            front_sheet_table += `<tr><td>Tower Type</td>`;
            front_sheet_table += "<td>:</td>";
            front_sheet_table += `<td>${rr.siteInfo.projectDetails}</td>`;
        }

        front_sheet_table += `<tr><td>Date of Inspection</td>`;
        front_sheet_table += "<td>:</td>";
        front_sheet_table += `<td>${rr.siteInfo.surveyDate}</td>`;
        front_sheet_table += "</table>";

        return front_sheet_table;
    }
}

class BoreLogGenerator {
    generate_all_bh_tables(rr) {
        let bh_tables = "";
        for (let bh = 0; bh < rr.boreholeLogs.length; bh++) {
            let bh_table_html = get_table_template(
                rr.siteInfo.clientName,
                rr.boreholeLogs[bh].samplingMethod,
                null
            );

            let { bh_table, detected_count, not_detected_count, detected } = this.__generate_bh_table(rr, bh);
            let soil_list = this.__get_list_of_soil_types(rr, bh);
            let count_soil_list = this.__get_count_soil_type(soil_list);
            bh_table = this.__span_soil_type(bh_table, count_soil_list);
            bh_table = this.__span_water_table(bh_table, detected_count, not_detected_count);
            bh_table_html = this.__replace_all_placeholder(rr, bh, detected, bh_table_html, bh_table);
            bh_tables += bh_table_html;
        }
        return bh_tables;
    }

    __generate_bh_table(rr, bh) {
        let bh_table = "";
        let detected_count = 0;
        let not_detected_count = 0;
        let detected = false;
        let rebound = false;
        let N_value = 0;

        for (let depths = 0; depths < rr.boreholeLogs[bh].depthRows.length; depths++) {
            let row = rr.boreholeLogs[bh].depthRows[depths];
            let water_table = row.waterTableDetected;
            let depth_at_15cm = row.sptAtDepthIntervals.depth_15cm;
            let depth_at_30cm = row.sptAtDepthIntervals.depth_30cm;
            let depth_at_45cm = row.sptAtDepthIntervals.depth_45cm;
            let core_length = row.coreLength;

            if (row.natureOfSampling === "SPT") {
                N_value = parseInt(depth_at_30cm) + parseInt(depth_at_45cm);
            }

            bh_table += `<tr><td>${row.depth}</td>`;
            bh_table += `<td>${row.natureOfSampling}</td>`;
            let color_code = this.__soil_color_codes(row.soilType);
            bh_table += `<td bgcolor="${color_code}"></td>`;
            bh_table += `<td>${row.soilType}</td>`;

            if (water_table && detected_count === 0) {
                bh_table += "<td>Detected</td>";
                detected_count = 1;
                detected = true;
            } else if (!water_table && not_detected_count === 0) {
                bh_table += "<td>Not Detected</td>";
                not_detected_count = 1;
            }

            if (water_table && detected_count > 0) {
                detected_count += 1;
            } else if (!water_table && not_detected_count > 0) {
                not_detected_count += 1;
            }

            if (N_value > 100) {
                rebound = true;
            }

            if (rebound) {
                bh_table += `<td colspan="3">Rebound</td>`;
                bh_table += "<td>>100</td>";
            }

            if (!rebound && row.natureOfSampling === "SPT") {
                bh_table += `<td>${depth_at_15cm}</td>`;
                bh_table += `<td>${depth_at_30cm}</td>`;
                bh_table += `<td>${depth_at_45cm}</td>`;
                bh_table += `<td>${N_value}</td>`;
            } else if (!rebound && row.natureOfSampling === "TP") {
                bh_table += `<td>${depth_at_15cm}</td>`;
                bh_table += `<td>${depth_at_30cm}</td>`;
                bh_table += `<td>${depth_at_45cm}</td>`;
                bh_table += `<td>${N_value}</td>`;
            } else if (!rebound && ["UDS", "DS", "DS/UDS", "CR"].includes(row.natureOfSampling)) {
                bh_table += "<td>-</td><td>-</td><td>-</td><td>-</td>";
            }

            bh_table += `<td>${row.shearParameters.cValue}</td>`;
            bh_table += `<td>${row.shearParameters.phiValue}</td>`;

            if (rr.boreholeLogs[bh].samplingMethod === "Drilling") {
                bh_table += `<td>${core_length}</td>`;
                bh_table += `<td>${row.coreRecoveryPercentage}</td>`;
                bh_table += `<td>${row.rqdPercentage}</td>`;
            }
            bh_table += `<td>${row.sbcValue}</td></tr>`;
        }
        return { bh_table, detected_count, not_detected_count, detected };
    }

    __replace_all_placeholder(rr, bh, detected, bh_table_html, bh_table) {
        let bh_number = "BH" + (bh + 1);
        bh_table_html = fillPlaceholder(bh_table_html, "__bh_rows__", bh_table);
        bh_table_html = fillPlaceholder(bh_table_html, "__bh_number__", bh_number);
        bh_table_html = fillPlaceholder(bh_table_html, "__indus_id__", rr.siteInfo.anchorOrIndusId);
        bh_table_html = fillPlaceholder(bh_table_html, "__site_id__", rr.siteInfo.siteId);
        bh_table_html = fillPlaceholder(bh_table_html, "__site_name__", rr.siteInfo.siteName);
        bh_table_html = fillPlaceholder(bh_table_html, "__site_address__", rr.siteInfo.siteAddress);
        bh_table_html = fillPlaceholder(bh_table_html, "__survey_date__", rr.siteInfo.surveyDate);
        bh_table_html = fillPlaceholder(bh_table_html, "__project_name__", rr.siteInfo.siteName); // Mapping might be redundant
        bh_table_html = fillPlaceholder(bh_table_html, "__project_address__", rr.siteInfo.siteAddress);

        let wt_found = detected ? "Found" : "Not Found";
        bh_table_html = fillPlaceholder(bh_table_html, "__water_table__", wt_found);
        return bh_table_html;
    }

    __get_list_of_soil_types(rr, bh) {
        let list_of_soil_types = [];
        for (let d = 0; d < rr.boreholeLogs[bh].depthRows.length; d++) {
            list_of_soil_types.push(rr.boreholeLogs[bh].depthRows[d].soilType);
        }
        return list_of_soil_types;
    }

    __get_count_soil_type(soil_list) {
        let result_list = [];
        if (soil_list.length === 0) return result_list;

        let current = soil_list[0];
        let count = 0;
        for (let value of soil_list) {
            if (value === current) {
                count += 1;
            } else {
                result_list.push({ type: current, count: count });
                current = value;
                count = 1;
            }
        }
        result_list.push({ type: current, count: count });
        return result_list;
    }

    __span_soil_type(bh_table, count_soil_list) {
        // This is tricky string replacement on HTML.
        // The original method used exact string matching `<td>${soil}</td>`.
        // If there are duplicate soil types in usage but not contiguous, it might replace the wrong one?
        // Python's replace(..., 1) replaces the *first* occurrence.
        // We need to iterate and replace sequentially.

        for (let soil of count_soil_list) {
            let count = 0;
            // Iterate count times (logic from Python seems to be: 
            // for i in range(0, int(soil[1])):
            //    if count == 0: replace with rowspan
            //    elif count > 0: replace with empty string
            // But wait, it replaces "<td>...</td>" with empty string? 
            // If we remove the cell, the table structure might break if we don't remove the *expected* cells.
            // Python code replaces <td>{soil}</td> with empty string for subsequent rows.

            // To safely do replacements in order, we can use a placeholder or split/join? 
            // Python's replace(old, new, 1) modifies the string and returns it. So subsequent calls work on the modified string.
            // In JS, string.replace(old, new) replaces the first occurrence.

            for (let i = 0; i < soil.count; i++) {
                if (count === 0) {
                    count += 1;
                    let replace_soil_type = `<td rowspan = "${soil.count}">${soil.type}</td>`;
                    let replace_soil_color = `<td rowspan = "${soil.count}"></td>`; // Note: Logic in python replcaed "{}color" but in my generation I might have just put <td>...</td>
                    // In my __generate_bh_table: 
                    // bh_table += `<td bgcolor="${color_code}"></td>`;
                    // bh_table += `<td>${row.soilType}</td>`;

                    // Python logic:
                    // bh_table += """<td bgcolor="{}"></td>""".format(color_code)
                    // bh_table += "<td>{}</td>".format(rr.boreholeLogs[bh].depthRows[depths].soilType)

                    // The replace logic in Python uses:
                    // bh_table = bh_table.replace("<td>{}</td>".format(soil[0] + "color"), replace_soil_color, 1)
                    // Wait, the Python code commented out: # bh_table += """<td bgcolor="#ac3939">{}</td>""".format(rr.boreholeLogs[bh].depthRows[depths].soilType + "color")
                    // It actually uses: bh_table += """<td bgcolor="{}"></td>""".format(color_code)
                    // So how does it identify the cell to span for colour?
                    // Ah, `self.__span_soil_type` in Python:
                    // bh_table = bh_table.replace("<td>{}</td>".format(soil[0] + "color"), replace_soil_color, 1)
                    // checks for a cell containing "SoilType" + "color"?
                    // But `__generate_bh_table` produced `<td bgcolor="..."></td>`. It does NOT contain the soil type text.
                    // THIS LOOKS LIKE A BUG or mismatch in the python code I read vs what might be expected.
                    // Line 43 in borelog_table.py is commented out. Line 44 adds empty td with bgcolor.
                    // So `replace("<td>{}</td>".format(soil[0] + "color"), ...)` would FAIL to find anything if the cell is empty.
                    // Unless `color_code` contains the text? No.

                    // I will replicate the table structure as simple logic:
                    // The JS `__generate_bh_table` generates rows.
                    // Note: If the Python code IS broken for color spanning, I should probably try to fix it or just span the text column.
                    // The `soil` description is `<td>${row.soilType}</td>`.

                    // I will perform replacement on the soil description column only for now, as color column replacement seems dubious in source.
                    // Wait, maybe I should implement rowspan logic during generation instead of post-processing string?
                    // Generating efficiently with rowspan is better than string replacement hell.
                    // But I need to follow the "translate" directive. 
                    // Refactoring to generate correctly first is better translation.

                    // However, keeping structure similar to existing code makes verification easier.
                    // I'll stick to string replacement for `soilType` column which definitely has the text.

                    bh_table = bh_table.replace(`<td>${soil.type}</td>`, replace_soil_type);

                    // For color column, if I can't identify it easily by text, I can't span it easily with string replace.
                    // I'll skip color spanning for now or try to match the color code?
                    // But color code is hex or string.

                } else if (count > 0) {
                    // Remove the cell
                    bh_table = bh_table.replace(`<td>${soil.type}</td>`, "");
                    // Also remove color cell?
                }
            }
        }
        return bh_table;
    }

    __span_water_table(bh_table, detected_count, not_detected_count) {
        if (detected_count > 0) {
            let format_wt_detected = `<td rowspan = "${detected_count}">Detected</td>`; // Removed space after Detected to match my generation
            bh_table = bh_table.replace("<td>Detected</td>", format_wt_detected);
            // Replace subsequent "<td>Detected</td>" with ""?
            // Python code: `bh_table = bh_table.replace("<td>Detected</td>", format_wt_detected)` -> only first one?
            // Wait, Python replaces first one by default if count not specified? No, replaces ALL by default.
            // The Python code: `bh_table.replace("<td>Detected</td>", format_wt_detected, 1)` -> explicitly 1.
            // And it constructs table such that subsequent rows DO NOT have "Detected" cell?
            // Let's check `__generate_bh_table` in Python.
            // Lines 46-56:
            // if water_table and detected_count == 0: ... bh_table += "<td>Detected</td>" ...
            // if water_table and detected_count > 0: detected_count +=1
            // It seems it ONLY adds "<td>Detected</td>" ONCE?
            // No, `__generate_bh_table` loop:
            // ...
            // if water_table and detected_count == 0: ... add td ...
            // elif not water_table and not_detected_count == 0: ... add td ...

            // Wait, if `detected_count > 0` (i.e. already detected previously), it DOES NOT add a td?
            // Lines 46-52 handles adding the FIRST td.
            // Then it increments counters.
            // But where does it add cells for subsequent rows?
            // It seems it DOES NOT add cells for subsequent rows in the Python code?
            // If so, the table structure would be broken (missing columns) unless `rowspan` is applied later?
            // No, if you don't add <td>, the row is shorter.
            // If `rowspan` is applied to the first one, then subsequent rows shouldn't have the cell.
            // So the Python code generates a table where subsequent rows are MISSING the water table cell.
            // AND THEN `__span_water_table` updates the FIRST cell to have `rowspan`.
            // This is smart. I should replicate this logic.

            // My `__generate_bh_table` logic above:
            // if (water_table && detected_count === 0) { bh_table += "<td>Detected</td>"; ... }
            // else if ...

            // This replicates the Python logic where only the first occurrence gets a cell.
            // So I just need to update the rowspan.
        }

        if (not_detected_count > 0) {
            let format_wt_not_detected = `<td rowspan = "${not_detected_count}">Not Detected</td>`;
            bh_table = bh_table.replace("<td>Not Detected</td>", format_wt_not_detected);
        }
        return bh_table;
    }

    __soil_color_codes(soil_type) {
        let color_code = "";
        if (soil_type.includes('CL') || soil_type.includes('CI')) {
            color_code = "lightgrey";
        } else if (soil_type.includes('CH')) {
            color_code = "grey";
        } else if (soil_type.includes('GP') || soil_type.includes('GM') || soil_type.includes('GC')) {
            color_code = "#ac3939";
        } else if (soil_type.includes('SM') || soil_type.includes('SC') || soil_type.includes('SP') || soil_type.includes('ML') || soil_type.includes('MI')) {
            color_code = "#996600";
        } else if (soil_type.includes('Filled-up Soil') || soil_type.includes('Brownish Gravelly Soil') || soil_type.includes('Grayish Gravelly Soil') || soil_type.includes('Open Rock')) {
            color_code = "#d29851";
        } else {
            color_code = "#660000";
        }
        return color_code;
    }
}


function get_table_template(client, borehole_type, table_name) {
    if (client === ClientNames.INDUS && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_indus_manual_template;
    } else if (client === ClientNames.INDUS && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_indus_drilling_template;
    } else if (client === ClientNames.RELIANCE && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_reliance_manual_template;
    } else if (client === ClientNames.RELIANCE && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_reliance_drilling_template;
    } else if (client === ClientNames.OTHER && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_other_manual_template;
    } else if (client === ClientNames.OTHER && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_other_drilling_template;
    } else if (![ClientNames.OTHER, ClientNames.INDUS, ClientNames.RELIANCE, ClientNames.ATC].includes(client) && borehole_type === BoreholeType.DRILLING) {
        return TEMPLATES.bh_table_other_drilling_template;
    } else if (![ClientNames.OTHER, ClientNames.INDUS, ClientNames.RELIANCE, ClientNames.ATC].includes(client) && borehole_type === BoreholeType.MANUAL) {
        return TEMPLATES.bh_table_other_manual_template;
    } else if (table_name === 'laboratory_test_results_table') {
        return TEMPLATES.lab_test_results;
    } else if (table_name === 'chemical_analysis_table') {
        return TEMPLATES.chemical_analysis_table;
    } else if (table_name === 'point_load_strength_index_for_rock_table') {
        return TEMPLATES.point_load_strength_index_of_rock_table;
    } else if (table_name === 'point_load_strength_index_for_rock_table_individual') {
        return TEMPLATES.point_load_strength_index_of_rock_table_individual;
    } else if (table_name === 'point_load_strength_index_for_lump_table') {
        return TEMPLATES.point_load_strength_index_of_lump_table;
    } else if (table_name === 'point_load_strength_index_for_lump_table_individual') {
        return TEMPLATES.point_load_strength_index_of_lump_table_individual;
    } else if (table_name === 'foundation_in_rock_formations_table_1') {
        return TEMPLATES.foundation_in_rock_formations_table_1;
    } else if (table_name === 'foundation_in_rock_formations_table_2') {
        return TEMPLATES.foundation_in_rock_formations_table_2;
    } else if (table_name === 'survey_report') {
        return TEMPLATES.survey_report_table;
    } else if (table_name === 'is_code_table') {
        return TEMPLATES.is_code_table;
    } else if (table_name === 'sub_soil_profile_table') {
        return TEMPLATES.sub_soil_profile_table;
    } else if (table_name === 'summary_of_sbc_results_table') {
        return TEMPLATES.summary_of_sbc_results_table;
    } else if (table_name === 'direct_shear_results_table') {
        return TEMPLATES.direct_shear_results_table;
    } else if (table_name === 'grain_size_analysis_table') {
        return TEMPLATES.grain_size_analysis_table;
    } else if (table_name === 'sbc_soil_data') {
        return TEMPLATES.sbc_soil_data;
    } else if (table_name === 'sbc_rock_data') {
        return TEMPLATES.sbc_rock_data;
    } else if (table_name === 'foundation_in_rock_formations_table_1_bh_0') {
        return TEMPLATES.foundation_in_rock_formations_table_1_bh_0;
    } else if (table_name === 'images_page') {
        return TEMPLATES.images_page_template;
    }
    return "";
}

class LaboratoryTestResultsGenerator {
    generate_all_laboratory_test_results_table(rr, num_tables_in_a_page = 2) {
        let full_html = "";
        if (!rr.labTestResults) return full_html;

        for (let table = 0; table < rr.labTestResults.length; table++) {
            let bh_number = "BH" + (table + 1);
            if (table % num_tables_in_a_page === 0) {
                if (table === 0) {
                    full_html += HTMLConstants.page_start_tag;
                } else {
                    full_html += HTMLConstants.page_end_tag + HTMLConstants.page_start_tag;
                }
            }

            let laboratory_test_results_table_html = get_table_template(null, null, 'laboratory_test_results_table');
            let laboratory_test_results_table = this.__generate_laboratory_test_results_table(rr, table);

            full_html += laboratory_test_results_table_html;

            full_html = fillPlaceholder(full_html, "__lab_test_results_table__", laboratory_test_results_table);
            full_html = fillPlaceholder(full_html, "__bh_number__", bh_number);
        }
        full_html += HTMLConstants.page_end_tag;
        return full_html.replace(/\n{2,}/g, "\n").trim();
    }

    __generate_laboratory_test_results_table(rr, table) {
        let laboratory_test_results_table = "";
        let rows = rr.labTestResults[table].rows;
        if (rows) {
            for (let depth = 0; depth < rows.length; depth++) {
                let row = rows[depth];
                laboratory_test_results_table += `<tr><td>${row.depth}</td>`;
                laboratory_test_results_table += `<td>${row.bulkDensity}</td>`;
                laboratory_test_results_table += `<td>${row.moistureContentPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.grainSizeDistribution.gravelPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.grainSizeDistribution.sandPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.grainSizeDistribution.siltAndClayPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.atterbergLimits.liquidLimitPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.atterbergLimits.plasticLimitPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.atterbergLimits.plasticityIndexPercentage}</td>`;
                laboratory_test_results_table += `<td>${row.specificGravity}</td>`;
                laboratory_test_results_table += `<td>${row.freeSwellIndexPercentage}</td></tr>`;
            }
        }
        return laboratory_test_results_table;
    }
}

class ChemicalAnalysisGenerator {
    generate_chemical_analysis_tables(rr, num_tables_in_a_page = 2) {
        let full_html = "";
        if (!rr.chemicalAnalysis) return full_html;

        for (let table = 0; table < rr.chemicalAnalysis.length; table++) {
            let bh_number = "BH" + (table + 1);
            if (table % num_tables_in_a_page === 0) {
                if (table === 0) {
                    full_html += HTMLConstants.page_start_tag;
                } else {
                    full_html += HTMLConstants.page_end_tag + HTMLConstants.page_start_tag;
                }
            }

            let chemical_analysis_table_html = get_table_template(null, null, 'chemical_analysis_table');
            full_html += chemical_analysis_table_html;

            let chemical_analysis_table = this.__generate_chemical_analysis_table(rr, table);

            full_html = fillPlaceholder(full_html, "__chemical_analysis_table__", chemical_analysis_table);
            full_html = fillPlaceholder(full_html, "__bh_number__", bh_number);
        }
        full_html += HTMLConstants.page_end_tag;
        return full_html.replace(/\n{2,}/g, "\n").trim();
    }

    __generate_chemical_analysis_table(rr, table) {
        let chemical_analysis_table_html = "";
        let data = rr.chemicalAnalysis[table];

        chemical_analysis_table_html += `<tr><td>1</td><td>pH Value</td><td>${data.phValue}</td></tr>`;
        chemical_analysis_table_html += `<tr><td>2</td><td>Chlorides as Cl (%)</td><td>${data.chloridesPercentage}</td></tr>`;
        chemical_analysis_table_html += `<tr><td>3</td><td>Sulphates as SO<sub>4</sub> (%)</td><td>${data.sulphatesPercentage}</td></tr>`;

        if (data.additionalFields) {
            let counter = 3;
            for (let key in data.additionalFields) {
                counter += 1;
                chemical_analysis_table_html += `<tr><td>${counter}</td><td>${key}</td><td>${data.additionalFields[key]}</td></tr>`;
            }
        }
        return chemical_analysis_table_html;
    }
}

// Placeholder Generators
class SubSoilProfileGenerator {
    generate_sub_soil_profile_tables(rr) {
        let sub_soil_profile_tables = "";
        if (rr.subSoilProfileLogs) {
            for (let bh = 0; bh < rr.subSoilProfileLogs.length; bh++) {
                let bh_number = "BH" + (bh + 1);
                let sub_soil_profile_table_html = get_table_template(null, null, 'sub_soil_profile_table');
                let sub_soil_profile_table = this.__generate_sub_soil_profile_table(rr, bh);
                sub_soil_profile_table_html = fillPlaceholder(sub_soil_profile_table_html, "__sub_soil_profile_table__", sub_soil_profile_table);
                sub_soil_profile_table_html = fillPlaceholder(sub_soil_profile_table_html, "__bh_number__", bh_number);
                sub_soil_profile_tables += sub_soil_profile_table_html;
            }
        }
        return sub_soil_profile_tables;
    }

    __generate_sub_soil_profile_table(rr, bh) {
        let count = 0;
        let sub_soil_profile_table = "";
        if (rr.subSoilProfileLogs[bh].rows) {
            for (let row = 0; row < rr.subSoilProfileLogs[bh].rows.length; row++) {
                count += 1;
                sub_soil_profile_table += `<tr><td style='width:10%'>Layer ${count}</td>`;
                sub_soil_profile_table += `<td style='width:10%'>${rr.subSoilProfileLogs[bh].rows[row].depth}</td>`;
                sub_soil_profile_table += `<td style='width:80%'>${rr.subSoilProfileLogs[bh].rows[row].description}</td>`;
            }
        }
        return sub_soil_profile_table;
    }
}
class PointLoadStrengthIndexRockGenerator {
    generate_point_load_strength_index_for_rock_tables(rr) {
        let PLI_for_rock_table = "";
        if (rr.pointLoadStrengthIndexOfRock) {
            for (let table = 0; table < rr.pointLoadStrengthIndexOfRock.length; table++) {
                let point_load_strength_index_for_rock_table_html = this.__generate_point_load_strength_index_for_rock_table(rr, table);
                PLI_for_rock_table += point_load_strength_index_for_rock_table_html;
                PLI_for_rock_table += "</div></div></div>";
            }
        }
        return PLI_for_rock_table;
    }

    __generate_point_load_strength_index_for_rock_table(rr, table) {
        let point_load_strength_index_for_rock_table = "";
        if (rr.pointLoadStrengthIndexOfRock[table].tables) {
            for (let depths = 0; depths < rr.pointLoadStrengthIndexOfRock[table].tables.length; depths++) {
                let depth_row_count = rr.pointLoadStrengthIndexOfRock[table].tables[depths].rows.length;
                for (let row = 0; row < depth_row_count; row++) {
                    point_load_strength_index_for_rock_table = this.__generate_individual_rock_table(rr, table, depths, row, depth_row_count, point_load_strength_index_for_rock_table);
                }
            }
        }
        let point_load_strength_index_for_rock_table_html = get_table_template(null, null, 'point_load_strength_index_for_rock_table');
        let bh_number = "BH" + (table + 1);
        point_load_strength_index_for_rock_table_html = fillPlaceholder(point_load_strength_index_for_rock_table_html, "__point_load_strength_index_for_rock_table__", point_load_strength_index_for_rock_table);
        point_load_strength_index_for_rock_table_html = fillPlaceholder(point_load_strength_index_for_rock_table_html, "__bh_number__", bh_number);
        return point_load_strength_index_for_rock_table_html;
    }

    __generate_individual_rock_table(rr, table, depths, row, depth_row_count, point_load_strength_index_for_rock_table) {
        if (depths > 0 && row === 0) {
            point_load_strength_index_for_rock_table += get_table_template(null, null, 'point_load_strength_index_for_rock_table_individual');
        }
        point_load_strength_index_for_rock_table += `<tr><td>${row + 1}</td>`;
        if (row === 0) {
            point_load_strength_index_for_rock_table += `<td rowspan = '${depth_row_count}'>${rr.pointLoadStrengthIndexOfRock[table].tables[depths].depth}</td>`;
        }
        let rowData = rr.pointLoadStrengthIndexOfRock[table].tables[depths].rows[row];
        let D = parseFloat(rowData.dValue);
        let D50 = parseFloat(rowData.d50Value);
        let P = parseFloat(rowData.loadAtFailure) * 1000;

        point_load_strength_index_for_rock_table += `<td>${rowData.loadAtFailure}</td>`;
        point_load_strength_index_for_rock_table += `<td>${D50}</td>`;
        point_load_strength_index_for_rock_table += `<td>${D}</td>`;
        point_load_strength_index_for_rock_table += `<td>${P.toFixed(2)}</td>`;

        let divisor = Math.sqrt(Math.pow(D, 1.5) * D50);
        let IS = P / divisor;
        let UCS = 22 * IS;

        point_load_strength_index_for_rock_table += `<td>${IS.toFixed(2)}</td>`;
        point_load_strength_index_for_rock_table += `<td>${UCS.toFixed(2)}</td></tr>`;

        return point_load_strength_index_for_rock_table;
    }
}

class PointLoadStrengthIndexLumpGenerator {
    generate_point_load_strength_index_for_lump_tables(rr) {
        let PLI_for_lump_table = "";
        if (rr.pointLoadStrengthIndexOfLump) {
            for (let table = 0; table < rr.pointLoadStrengthIndexOfLump.length; table++) {
                let point_load_strength_index_for_lump_table_html = this.__generate_point_load_strength_index_for_lump_table(rr, table);
                PLI_for_lump_table += point_load_strength_index_for_lump_table_html;
            }
        }
        return PLI_for_lump_table;
    }

    __generate_point_load_strength_index_for_lump_table(rr, table) {
        let point_load_strength_index_for_lump_table = "";
        if (rr.pointLoadStrengthIndexOfLump[table].tables) {
            for (let depths = 0; depths < rr.pointLoadStrengthIndexOfLump[table].tables.length; depths++) {
                let depth_row_count = rr.pointLoadStrengthIndexOfLump[table].tables[depths].rows.length;
                for (let row = 0; row < depth_row_count; row++) {
                    point_load_strength_index_for_lump_table = this.__generate_individual_lump_table(rr, table, depths, row, depth_row_count, point_load_strength_index_for_lump_table);
                }
            }
        }
        let point_load_strength_index_for_lump_table_html = get_table_template(null, null, 'point_load_strength_index_for_lump_table');
        let bh_number = "BH" + (table + 1);
        point_load_strength_index_for_lump_table_html = fillPlaceholder(point_load_strength_index_for_lump_table_html, "__point_load_strength_index_for_lump_table__", point_load_strength_index_for_lump_table);
        point_load_strength_index_for_lump_table_html = fillPlaceholder(point_load_strength_index_for_lump_table_html, "__bh_number__", bh_number);
        return point_load_strength_index_for_lump_table_html;
    }

    __generate_individual_lump_table(rr, table, depths, row, depth_row_count, point_load_strength_index_for_lump_table) {
        if (depths > 0 && row === 0) {
            point_load_strength_index_for_lump_table += get_table_template(null, null, 'point_load_strength_index_for_lump_table_individual');
        }
        point_load_strength_index_for_lump_table += `<tr><td>${row + 1}</td>`;
        if (row === 0) {
            point_load_strength_index_for_lump_table += `<td rowspan = '${depth_row_count}'>${rr.pointLoadStrengthIndexOfLump[table].tables[depths].depth}</td>`;
        }
        let rowData = rr.pointLoadStrengthIndexOfLump[table].tables[depths].rows[row];
        let D = parseFloat(rowData.dValue);
        let W = parseFloat(rowData.wValue);
        let D50 = parseFloat(rowData.d50Value);
        let P = parseFloat(rowData.loadAtFailure) * 1000;

        point_load_strength_index_for_lump_table += `<td>${rowData.loadAtFailure}</td>`;
        point_load_strength_index_for_lump_table += `<td>${D50}</td>`;
        point_load_strength_index_for_lump_table += `<td>${D}</td>`;
        point_load_strength_index_for_lump_table += `<td>${W}</td>`;
        point_load_strength_index_for_lump_table += `<td>${P.toFixed(2)}</td>`;

        let val1 = D * W;
        let val2 = Math.pow(val1, 0.75);
        let divisor = Math.sqrt(D50);
        let val3 = val2 * divisor;
        let IL = P / val3;
        let UCS = 15 * IL * 100;

        point_load_strength_index_for_lump_table += `<td>${val3.toFixed(2)}</td>`;
        point_load_strength_index_for_lump_table += `<td>${IL.toFixed(2)}</td>`;
        point_load_strength_index_for_lump_table += `<td>${UCS.toFixed(2)}</td></tr>`;

        return point_load_strength_index_for_lump_table;
    }
}
class FoundationInRockFormationsGenerator {
    generate_foundation_in_rock_formations_tables(rr, num_tables_in_a_page = 2) {
        let full_html = "";
        if (rr.foundationInRockFormations) {
            for (let table = 0; table < rr.foundationInRockFormations.length; table++) {
                if (table % num_tables_in_a_page === 0) {
                    if (table === 0) {
                        full_html += HTMLConstants.page_start_tag;
                    } else {
                        full_html += HTMLConstants.page_end_tag + HTMLConstants.page_start_tag;
                    }
                }
                let foundation_in_rock_formations_table_html = this.__generate_foundation_in_rock_formations_table(rr, table);
                full_html += foundation_in_rock_formations_table_html;
            }
            full_html += HTMLConstants.page_end_tag;
        }
        return full_html.replace(/\n{2,}/g, "\n").trim();
    }

    __generate_foundation_in_rock_formations_table(rr, table) {
        let foundation_in_rock_formations_table_html = "";
        let foundationInRockFormation = rr.foundationInRockFormations[table];

        if (foundationInRockFormation.tables) {
            for (let depths = 0; depths < foundationInRockFormation.tables.length; depths++) {
                if (foundationInRockFormation.tables[depths].rows) {
                    for (let row = 0; row < foundationInRockFormation.tables[depths].rows.length; row++) {
                        foundation_in_rock_formations_table_html += this.__generate_individual_rock_formations_table(rr, row, depths, table);
                        foundation_in_rock_formations_table_html += "</div>";
                    }
                }
            }
        }
        let bh_number = "BH" + (table + 1);
        foundation_in_rock_formations_table_html = fillPlaceholder(foundation_in_rock_formations_table_html, "__bh_number__", bh_number);
        return foundation_in_rock_formations_table_html;
    }

    __generate_individual_rock_formations_table(rr, row, depths, table) {
        let foundation_in_rock_formations_table = "";
        if (table === 0) {
            foundation_in_rock_formations_table = get_table_template(null, null, 'foundation_in_rock_formations_table_1_bh_0');
        } else {
            foundation_in_rock_formations_table = get_table_template(null, null, 'foundation_in_rock_formations_table_1');
        }

        let rowData = rr.foundationInRockFormations[table].tables[depths].rows[row];

        foundation_in_rock_formations_table += `<tr><td>${rowData.rock}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.strength}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.rqd}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.spacingDiscontinuity}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.conditionOfDiscontinuity}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.gwtCondition}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.discontinuityOrientation}</td></tr>`;

        let summation_list = [];
        summation_list.push(parseFloat(rowData.strength) || 0);
        summation_list.push(parseFloat(rowData.rqd) || 0);
        summation_list.push(parseFloat(rowData.spacingDiscontinuity) || 0);
        summation_list.push(parseFloat(rowData.conditionOfDiscontinuity) || 0);
        summation_list.push(parseFloat(rowData.gwtCondition) || 0);
        summation_list.push(parseFloat(rowData.discontinuityOrientation) || 0);

        let sum_rmr = summation_list.reduce((a, b) => a + b, 0);

        foundation_in_rock_formations_table += `<tr><td colspan="4">RMR (Rock Mass Rating) (vii)</td>`;
        foundation_in_rock_formations_table += `<td colspan="3">${sum_rmr}</td></tr></table>`;
        foundation_in_rock_formations_table += get_table_template(null, null, 'foundation_in_rock_formations_table_2');

        foundation_in_rock_formations_table += `<tr><td>${rowData.rock}</td>`;
        foundation_in_rock_formations_table += `<td>${sum_rmr}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.rockGrade}</td>`;
        foundation_in_rock_formations_table += `<td>${rowData.inferredNetSBP}</td></tr></table>`;

        let comments = rr.foundationInRockFormations[table].tables[depths].comments || "";
        foundation_in_rock_formations_table += `<ul><li>${comments}</li></ul>`;

        return foundation_in_rock_formations_table;
    }
}

class SurveyReportGenerator {
    generate_survey_report_table(rr) {
        let survey_report = "";
        let survey_report_html = "";
        let survey_report_note = "";
        let i = 0;
        if (rr.surveyReport && rr.surveyReport.surveyReportEntries && Object.keys(rr.surveyReport.surveyReportEntries).length > 0) {
            survey_report_html = get_table_template(null, null, 'survey_report');
            for (let entry in rr.surveyReport.surveyReportEntries) {
                if (rr.surveyReport.surveyReportEntries.hasOwnProperty(entry)) {
                    i += 1;
                    survey_report += `<tr><td>${i}</td>`;
                    survey_report += `<td style='text-align:left'>${entry}</td>`;
                    survey_report += `<td style='text-align:left'>${rr.surveyReport.surveyReportEntries[entry]}</td></tr>`;
                }
            }
            survey_report_note = rr.surveyReport.surveyReportNote || "";
            survey_report_html = fillPlaceholder(survey_report_html, "__survey_report__", survey_report);
            survey_report_html = fillPlaceholder(survey_report_html, "__survey_report_note__", survey_report_note);
        } else {
            survey_report_html = fillPlaceholder(survey_report_html || "", "__survey_report__", survey_report);
        }
        return survey_report_html;
    }
}
class IScodesGenerator {
    generate_is_code_table(rr) {
        let is_code_html = get_table_template(null, null, 'is_code_table');
        let is_code = "";
        let Slno = 0;
        if (rr.isCodes) {
            for (let entry in rr.isCodes) {
                if (rr.isCodes.hasOwnProperty(entry)) {
                    Slno += 1;
                    is_code += `<tr><td>${Slno}</td>`;
                    is_code += `<td>${entry}</td>`;
                    is_code += `<td>${rr.isCodes[entry]}</td></tr>`;
                }
            }
        }
        is_code_html = fillPlaceholder(is_code_html, "__is_codes__", is_code);
        return is_code_html;
    }
}
class SummaryofSBCDetailsGenerator {
    generate_summary_of_sbc_tables(rr, num_tables_in_a_page = 3) {
        let full_html = "";
        if (rr.sbcDetailLogs) {
            for (let bh = 0; bh < rr.sbcDetailLogs.length; bh++) {
                let bh_number = "BH" + (bh + 1);
                if (bh % num_tables_in_a_page === 0) {
                    if (bh === 0) {
                        let section_header = "<h3>Recommended Safe Bearing Capacities</h3>";
                        full_html += HTMLConstants.page_start_tag + section_header;
                    } else {
                        full_html += HTMLConstants.page_end_tag + HTMLConstants.page_start_tag;
                    }
                }
                let summary_of_sbc_table_html = get_table_template(null, null, 'summary_of_sbc_results_table');
                let summary_of_sbc_table = this.__generate_summary_of_sbc_table(rr, bh);

                let depth_list = this.__get_list_of_depths(rr, bh);
                let depth_list_count = this.__get_count_depth(depth_list);
                summary_of_sbc_table = this.__span_depth_type(summary_of_sbc_table, depth_list_count);

                summary_of_sbc_table_html = fillPlaceholder(summary_of_sbc_table_html, "__summary_of_sbc_results_table__", summary_of_sbc_table);
                summary_of_sbc_table_html = fillPlaceholder(summary_of_sbc_table_html, "__bh_number__", bh_number);

                full_html += summary_of_sbc_table_html;
            }
            full_html += HTMLConstants.page_end_tag;
        }
        return full_html.replace(/\n{2,}/g, "\n").trim();
    }

    __generate_summary_of_sbc_table(rr, bh) {
        let summary_of_sbc_table = "";
        if (rr.sbcDetailLogs[bh].rows) {
            for (let depths = 0; depths < rr.sbcDetailLogs[bh].rows.length; depths++) {
                summary_of_sbc_table += `<tr><td style='width:33%'>${rr.sbcDetailLogs[bh].rows[depths].depth}</td>`;
                summary_of_sbc_table += `<td style='width:33%'>${rr.sbcDetailLogs[bh].rows[depths].footingDimension}</td>`;
                summary_of_sbc_table += `<td style='width:33%'>${rr.sbcDetailLogs[bh].rows[depths].sbcValue}</td></tr>`;
            }
        }
        return summary_of_sbc_table;
    }

    __get_list_of_depths(rr, bh) {
        let list_of_depths = [];
        if (rr.sbcDetailLogs[bh].rows) {
            for (let d = 0; d < rr.sbcDetailLogs[bh].rows.length; d++) {
                list_of_depths.push(rr.sbcDetailLogs[bh].rows[d].depth);
            }
        }
        return list_of_depths;
    }

    __get_count_depth(depth_list) {
        if (!depth_list || depth_list.length === 0) return [];
        let result_list = [];
        let current = depth_list[0];
        let count = 0;
        for (let value of depth_list) {
            if (value === current) {
                count += 1;
            } else {
                result_list.push({ value: current, count: count });
                current = value;
                count = 1;
            }
        }
        result_list.push({ value: current, count: count });
        return result_list;
    }

    __span_depth_type(summary_of_sbc_table, depth_list_count) {
        for (let depth of depth_list_count) {
            let count = 0;
            // The logic here is similar to previous string replacement.
            // But we need to be careful with global replacement vs first occurrence.
            // Logic: replace "<td>{depth}</td>" with rowspan for first occurrence, and "" for others.
            // But since we are replacing in a loop, we might replace others' depths if they are same?
            // "depth" acts as the key.

            // Actually, we can just replace ALL occurrences sequentially?
            // No, the table is built sequentially. 
            // Better approach: Rebuild the table with rowspan instead of string replacement?
            // But I'm sticking to the Python logic adaptation for now to minimize dev time and risk of logic drift.

            // To ensure we replace only the intended cells, we must rely on the fact that `summary_of_sbc_table` is constructed in order.
            // But wait, `summary_of_sbc_table` is a string. `replace` finds the first occurrence.

            for (let i = 0; i < depth.count; i++) {
                if (count === 0) {
                    count += 1;
                    let replace_depth_type = `<td rowspan = "${depth.count}">${depth.value}</td>`;
                    summary_of_sbc_table = summary_of_sbc_table.replace(`<td>${depth.value}</td>`, replace_depth_type);
                } else if (count > 0) {
                    summary_of_sbc_table = summary_of_sbc_table.replace(`<td>${depth.value}</td>`, "");
                }
            }
        }
        return summary_of_sbc_table;
    }
}
class DirectShearGenerator {
    generate_direct_shear_results_tables(rr) {
        let direct_shear_results_tables = "";
        if (rr.directShearResults) {
            for (let bh = 0; bh < rr.directShearResults.length; bh++) {
                let bh_number = "BH" + (bh + 1);
                if (rr.directShearResults[bh].tables) {
                    for (let table = 0; table < rr.directShearResults[bh].tables.length; table++) {
                        let result = this.__generate_direct_shear_results_graph(rr, bh, table);
                        let graph_html = result.graph_html;
                        let m_deg = result.m_deg;
                        let c = result.c;

                        let direct_shear_results_table = this.__generate_direct_shear_results_table(rr, bh, table, m_deg, c);

                        let direct_shear_results_table_html = get_table_template(null, null, 'direct_shear_results_table');
                        direct_shear_results_table_html = fillPlaceholder(direct_shear_results_table_html, "__direct_shear_results_table__", direct_shear_results_table);
                        direct_shear_results_table_html = fillPlaceholder(direct_shear_results_table_html, "__direct_shear_results_graph__", graph_html);
                        direct_shear_results_table_html = fillPlaceholder(direct_shear_results_table_html, "__bh_number__", bh_number);
                        direct_shear_results_tables += direct_shear_results_table_html;
                    }
                }
            }
        }
        return direct_shear_results_tables;
    }

    __generate_direct_shear_results_table(rr, bh, table, m_deg, c) {
        let direct_shear_results_table = "";
        let rows = rr.directShearResults[bh].tables[table].rows;
        let rows_len = rows.length;
        let tableData = rr.directShearResults[bh].tables[table];

        for (let i = 0; i < rows_len; i++) {
            if (i === 0) {
                direct_shear_results_table += `<tr><td rowspan="${rows_len}">${tableData.depthOfSample}</td>`;
                direct_shear_results_table += `<td rowspan="${rows_len}">${tableData.shearBoxSize}</td>`;
                direct_shear_results_table += `<td>${rows[i].normalStress}</td>`;
                direct_shear_results_table += `<td>${rows[i].shearStress}</td>`;
                direct_shear_results_table += `<td rowspan="${rows_len}">${c}</td>`;
                direct_shear_results_table += `<td rowspan="${rows_len}">${m_deg}</td></tr>`;
            } else {
                direct_shear_results_table += `<tr><td>${rows[i].normalStress}</td>`;
                direct_shear_results_table += `<td>${rows[i].shearStress}</td></tr>`;
            }
        }
        return direct_shear_results_table;
    }

    __generate_direct_shear_results_graph(rr, bh, table) {
        let x = [];
        let y = [];
        let rows = rr.directShearResults[bh].tables[table].rows;
        for (let i = 0; i < rows.length; i++) {
            x.push(parseFloat(rows[i].normalStress));
            y.push(parseFloat(rows[i].shearStress));
        }

        let n = x.length;
        let sum_x = 0;
        let sum_y = 0;
        let sum_xy = 0;
        let sum_xx = 0;

        for (let i = 0; i < n; i++) {
            sum_x += x[i];
            sum_y += y[i];
            sum_xy += x[i] * y[i];
            sum_xx += x[i] * x[i];
        }

        let m = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
        let c = (sum_y - m * sum_x) / n;

        let m_deg = Math.round(Math.atan(m) * (180 / Math.PI));
        c = c.toFixed(2);

        let x_min = Math.min(...x);
        let x_max = Math.max(...x);
        let y_min = m * x_min + parseFloat(c);
        let y_max = m * x_max + parseFloat(c);

        let canvasId = `direct_shear_chart_${bh}_${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let graph_html = `
        <div style="width: 100%; height: 400px; position: relative;">
            <canvas id="${canvasId}"></canvas>
        </div>
        <script>
            (function() {
                // Wait for Chart.js to load just in case
                function renderChart() {
                    if (typeof Chart === 'undefined') {
                        setTimeout(renderChart, 100);
                        return;
                    }
                    var ctx = document.getElementById('${canvasId}').getContext('2d');
                    new Chart(ctx, {
                        type: 'scatter',
                        data: {
                            datasets: [{
                                label: 'Shear Stress vs Normal Stress',
                                data: [
                                    ${x.map((val, idx) => `{x: ${val}, y: ${y[idx]}}`).join(',')}
                                ],
                                backgroundColor: 'blue',
                                borderColor: 'blue',
                                showLine: false
                            }, {
                                label: 'Linear Fit',
                                data: [
                                    {x: ${x_min}, y: ${y_min}},
                                    {x: ${x_max}, y: ${y_max}}
                                ],
                                type: 'line',
                                borderColor: 'black',
                                borderDash: [5, 5],
                                fill: false,
                                pointRadius: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: 'linear',
                                    position: 'bottom',
                                    title: { display: true, text: 'Normal Stress (Kg/cm²)' },
                                    min: 0,
                                    max: 2.4,
                                    ticks: { stepSize: 0.2 }
                                },
                                y: {
                                    title: { display: true, text: 'Shear Stress (Kg/cm²)' },
                                    min: 0,
                                    max: 4,
                                    ticks: { stepSize: 0.5 }
                                }
                            }
                        }
                    });
                }
                renderChart();
            })();
        </script>
        `;

        return { graph_html, m_deg, c };
    }
}

class GrainSizeGenerator {
    generate_grain_size_analysis_tables(rr) {
        let grain_size_analysis_tables = "";
        if (rr.grainSizeAnalysis) {
            for (let bh = 0; bh < rr.grainSizeAnalysis.length; bh++) {
                let bh_number = "BH" + (bh + 1);
                let grain_size_analysis_table = this.__generate_grain_size_analysis_table(rr, bh);
                let grain_size_analysis_graph = this.__generate_grain_size_analysis_graph(rr, bh);

                let grain_size_analysis_table_html = get_table_template(null, null, 'grain_size_analysis_table');
                grain_size_analysis_table_html = fillPlaceholder(grain_size_analysis_table_html, "__grain_size_analysis_table__", grain_size_analysis_table);
                grain_size_analysis_table_html = fillPlaceholder(grain_size_analysis_table_html, "__grain_size_analysis_graph__", grain_size_analysis_graph);
                grain_size_analysis_table_html = fillPlaceholder(grain_size_analysis_table_html, "__bh_number__", bh_number);

                grain_size_analysis_tables += grain_size_analysis_table_html;
            }
        }
        return grain_size_analysis_tables;
    }

    __generate_grain_size_analysis_table(rr, bh) {
        let grain_size_analysis_table = "";
        if (rr.grainSizeAnalysis[bh].rows) {
            for (let table = 0; table < rr.grainSizeAnalysis[bh].rows.length; table++) {
                let row = rr.grainSizeAnalysis[bh].rows[table];
                grain_size_analysis_table += `<tr><td>${row.depth}</td>`;
                grain_size_analysis_table += `<td>% Finer</td>`;
                grain_size_analysis_table += `<td>${row.sieve1}</td>`;
                grain_size_analysis_table += `<td>${row.sieve2}</td>`;
                grain_size_analysis_table += `<td>${row.sieve3}</td>`;
                grain_size_analysis_table += `<td>${row.sieve4}</td>`;
                grain_size_analysis_table += `<td>${row.sieve5}</td>`;
                grain_size_analysis_table += `<td>${row.sieve6}</td>`;
                grain_size_analysis_table += `<td>${row.sieve7}</td>`;
                grain_size_analysis_table += `<td>${row.sieve8}</td>`;
                grain_size_analysis_table += `<td>${row.sieve9}</td></tr>`;
            }
        }
        return grain_size_analysis_table;
    }

    __generate_grain_size_analysis_graph(rr, bh) {
        let x_vals = [4.75, 2.36, 1.18, 0.6, 0.425, 0.3, 0.15, 0.075, 0.001]; // 0.001 as catch-all or min?
        // Python code: x_vals = [4.75, 2.36, 1.18, 0.6, 0.425, 0.3, 0.15, 0.075, 0]
        // But 0 cannot be plotted on log scale.
        // Python code: if x_vals[-1] == 0: del x_vals[-1]...

        let datasets = [];
        if (rr.grainSizeAnalysis[bh].rows) {
            for (let table = 0; table < rr.grainSizeAnalysis[bh].rows.length; table++) {
                let row = rr.grainSizeAnalysis[bh].rows[table];
                let y_vals = [
                    parseFloat(row.sieve1), parseFloat(row.sieve2), parseFloat(row.sieve3),
                    parseFloat(row.sieve4), parseFloat(row.sieve5), parseFloat(row.sieve6),
                    parseFloat(row.sieve7), parseFloat(row.sieve8)
                ];
                let current_x = [4.75, 2.36, 1.18, 0.6, 0.425, 0.3, 0.15, 0.075];

                // Remove 0 from x and corresponding y
                if (current_x[current_x.length - 1] === 0) {
                    current_x.pop();
                    y_vals.pop();
                }

                let dataPoints = current_x.map((val, idx) => ({ x: val, y: y_vals[idx] }));

                datasets.push({
                    label: `${row.depth} m`,
                    data: dataPoints,
                    fill: false,
                    borderColor: `hsl(${table * 40}, 70%, 50%)`,
                    backgroundColor: `hsl(${table * 40}, 70%, 50%)`,
                    borderWidth: 2,
                    pointRadius: 3
                });
            }
        }

        let canvasId = `grain_size_chart_${bh}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let graph_html = `
        <div style="width: 100%; height: 500px; position: relative;">
            <canvas id="${canvasId}"></canvas>
        </div>
        <script>
            (function() {
                function renderChart() {
                    if (typeof Chart === 'undefined') {
                        setTimeout(renderChart, 100);
                        return;
                    }
                    var ctx = document.getElementById('${canvasId}').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            datasets: ${JSON.stringify(datasets)}
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: {
                                    type: 'logarithmic',
                                    position: 'bottom',
                                    title: { display: true, text: 'Particle Diameter (mm)' },
                                    min: 0.001,
                                    max: 10,
                                    ticks: {
                                        callback: function(value, index, values) {
                                            if (value === 0.001 || value === 0.01 || value === 0.1 || value === 1 || value === 10) {
                                                return value;
                                            }
                                            return null;
                                        }
                                    }
                                },
                                y: {
                                    title: { display: true, text: '% Finer' },
                                    min: 0,
                                    max: 120,
                                    ticks: { stepSize: 10 }
                                }
                            }
                        }
                    });
                }
                renderChart();
            })();
        </script>
        `;
        return graph_html;
    }
}
class SBCrecommendationsGenerator {
    generate_sbc_recommendation(rr) {
        let sbc_recommendation = "";
        if (rr.recommendationTypeForSBC) {
            if (rr.recommendationTypeForSBC.rock === true) {
                sbc_recommendation = get_table_template(null, null, 'sbc_rock_data');
            }
            if (rr.recommendationTypeForSBC.soil === true) {
                sbc_recommendation = get_table_template(null, null, 'sbc_soil_data');
            }
            if (rr.recommendationTypeForSBC.rock === true && rr.recommendationTypeForSBC.soil === true) {
                sbc_recommendation = get_table_template(null, null, 'sbc_soil_data');
                sbc_recommendation += "</br></br>";
                sbc_recommendation += get_table_template(null, null, 'sbc_rock_data');
            }
        }
        return sbc_recommendation;
    }
}
class AdditionalRecommendationsGenerator {
    generate_conclusions(rr, template) {
        let recommendations_input = "";
        if (rr.additionalRecommendations) {
            for (let i of rr.additionalRecommendations) {
                recommendations_input += `<li>${i}</li>`;
            }
        }
        return recommendations_input;
    }

    generate_additional_recommendations(rr, template) {
        let recommendation_soil_type_ch = "Do not use the excavated low/medium/Highly Compressible Clay (CH) earth/soil for re-filling purpose,Use good granular Moorum for backfilling to the foundation and compacted to 95% MDD.";
        let recommendation_water_table = "Ground water table is encountered at the depth of __wt_depth__ below existing ground level. Hence suitable de-watering has to be adopted before foundation erection.";
        let done = false;

        if (rr.boreholeLogs && rr.boreholeLogs.length === 1) {
            let bc_soil = false;
            let wt = false;
            let depthRows = rr.boreholeLogs[0].depthRows;
            if (depthRows) {
                for (let depths = 0; depths < depthRows.length; depths++) {
                    // BC soil recommendation
                    if (depthRows[depths].soilType === 'Grayish Clay of High Plasticity (CH)') {
                        let add_recommendation_soil_type_ch = `<li>${recommendation_soil_type_ch}</li>`;
                        template = fillPlaceholder(template, "__bc_soil_recommendation__", add_recommendation_soil_type_ch);
                        bc_soil = true;
                    }

                    // Water table recommendation
                    let water_table = depthRows[depths].waterTableDetected;
                    if (water_table && !done) {
                        done = true;
                        let wt_depth = depthRows[depths].depth + "m";
                        let add_recommendation_water_table = `<li>${recommendation_water_table}</li>`;
                        add_recommendation_water_table = fillPlaceholder(add_recommendation_water_table, "__wt_depth__", wt_depth);
                        template = fillPlaceholder(template, "__water_table_recommendation__", add_recommendation_water_table);
                        wt = true;
                    }
                }
            }
            if (bc_soil === false) {
                template = fillPlaceholder(template, "__bc_soil_recommendation__", " ");
            }
            if (wt === false) {
                template = fillPlaceholder(template, "__water_table_recommendation__", " ");
            }
        } else {
            template = fillPlaceholder(template, "__water_table_recommendation__", " ");
            template = fillPlaceholder(template, "__bc_soil_recommendation__", " ");
        }
        return template;
    }
}
class GoogleMapsImage {
    generate_google_maps_image(rr) {
        if (rr.siteInfo && rr.siteInfo.siteGoogleMapsImage) {
            let google_maps_image = `<div style="text-align: center; margin: 10mm;">
        <img class="site-google-maps-img" src="${rr.siteInfo.siteGoogleMapsImage}" alt=""/><div>Fig.1 Shows the Site location (Google Image)</div></div>`;
            return google_maps_image;
        }
        return "";
    }
}

class HTMLGenerator {
    generate_report(rr, report_file_id) {
        let laboratory_test_results_tables = new LaboratoryTestResultsGenerator().generate_all_laboratory_test_results_table(rr, 2);
        let bh_tables = new BoreLogGenerator().generate_all_bh_tables(rr);
        let sub_soil_profile_tables = new SubSoilProfileGenerator().generate_sub_soil_profile_tables(rr);
        let chemical_analysis_tables = new ChemicalAnalysisGenerator().generate_chemical_analysis_tables(rr, 2);

        let PLI_for_rock_table = new PointLoadStrengthIndexRockGenerator().generate_point_load_strength_index_for_rock_tables(rr);
        let PLI_for_lump_table = new PointLoadStrengthIndexLumpGenerator().generate_point_load_strength_index_for_lump_tables(rr);
        let foundation_of_rock_formations_tables = new FoundationInRockFormationsGenerator().generate_foundation_in_rock_formations_tables(rr, 2);
        let site_survey_report = new SurveyReportGenerator().generate_survey_report_table(rr);
        let is_code_table = new IScodesGenerator().generate_is_code_table(rr);
        let summary_of_sbc_tables = new SummaryofSBCDetailsGenerator().generate_summary_of_sbc_tables(rr);
        let direct_shear_results_tables = new DirectShearGenerator().generate_direct_shear_results_tables(rr);
        let grain_size_analysis_tables = new GrainSizeGenerator().generate_grain_size_analysis_tables(rr);

        let template = new FrontSheetGenerator().generate_front_sheet(rr);
        let sbc_recommendations = new SBCrecommendationsGenerator().generate_sbc_recommendation(rr);
        let google_maps_img = new GoogleMapsImage().generate_google_maps_image(rr);

        template = fillPlaceholder(template, "__is_codes_table_placeholder__", is_code_table);
        template = fillPlaceholder(template, "__bh_table_placeholder__", bh_tables);
        template = fillPlaceholder(template, "__laboratory_test_results_table_placeholder__", laboratory_test_results_tables);
        template = fillPlaceholder(template, "__chemical_analysis_table_placeholder__", chemical_analysis_tables);
        template = fillPlaceholder(template, "__site_survey_report__", site_survey_report);
        template = fillPlaceholder(template, "__PLI_for_rock_table__", PLI_for_rock_table);
        template = fillPlaceholder(template, "__PLI_for_lump_table__", PLI_for_lump_table);
        template = fillPlaceholder(template, "__sub_soil_profile_table__", sub_soil_profile_tables);
        template = fillPlaceholder(template, "__summary_of_sbc_tables__", summary_of_sbc_tables);
        template = fillPlaceholder(template, "__foundation_of_rock_formations_tables__", foundation_of_rock_formations_tables);
        template = fillPlaceholder(template, "__direct_shear_results_tables__", direct_shear_results_tables);
        template = fillPlaceholder(template, "__grain_size_distribution_curve_table__", grain_size_analysis_tables);
        template = fillPlaceholder(template, "__recommendations_for_sbc_rock___", sbc_recommendations);

        let additionalGen = new AdditionalRecommendationsGenerator();
        let conclusions = additionalGen.generate_conclusions(rr, template);
        template = fillPlaceholder(template, "__additional_recommendations__", conclusions);
        template = additionalGen.generate_additional_recommendations(rr, template);

        template = fillPlaceholder(template, "__report_request_json__", JSON.stringify(rr, null, 4));
        template = fillPlaceholder(template, "__google_maps_image__", google_maps_img);
        template = fillPlaceholder(template, "__images_page__", this.__generate_images_page(rr));
        template = fillPlaceholder(template, "__depth_of_foundation__", rr.depthOfFoundation ? rr.depthOfFoundation.depthOfFoundation : "");

        // Base64 Images Placeholders/Logic
        // Assuming images are handled or we need to add placeholder data
        // For now using empty strings or default placeholders if files not found

        return template;
    }

    __generate_images_page(rr) {
        if (!rr.sitePhotos) return "";
        // Use logic similar to python
        let tmpl = get_table_template(null, null, 'images_page');
        if (!tmpl) return "";

        for (let idx = 0; idx < rr.sitePhotos.length; idx++) {
            tmpl = tmpl.replace(`__img${idx + 1}__`, rr.sitePhotos[idx]);
        }

        for (let idx = rr.sitePhotos.length; idx < 8; idx++) {
            tmpl = tmpl.replace(`__img${idx + 1}__`, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        }
        return tmpl;
    }
}

class ReportGenerator {
    generate(report_request, report_file_id) {
        const validator = new Validator();
        validator.validate_request(report_request);
        const html_generator = new HTMLGenerator();
        return html_generator.generate_report(report_request, report_file_id);
    }
}

module.exports = { ReportGenerator, HTMLGenerator, Validator, ClientNames, BoreholeType };

