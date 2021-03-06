/**
 * @name      ElkArte Forum
 * @copyright ElkArte Forum contributors
 * @license   BSD http://opensource.org/licenses/BSD-3-Clause
 *
 * This software is a derived product, based on:
 *
 * Simple Machines Forum (SMF)
 * copyright:	2011 Simple Machines (http://www.simplemachines.org)
 * license:		BSD, See included LICENSE.TXT for terms and conditions.
 *
 * @version 1.0 Beta
 *
 * This file contains javascript surrounding personal messages send form.
 */

/**
 * Personal message Send controller
 *
 * sSelf: instance name
 * sSessionId:
 * sSessionVar:
 * sTextDeleteItem: text string to show when
 * sToControlId: id of the to auto suggest input
 * aToRecipients: array of members its going to
 * aBccRecipients: array of member to BCC
 * sBccControlId: id of the bcc auto suggest input
 * sBccDivId: container holding the bbc input
 * sBccDivId2: container holding the bcc chosen name
 * sBccLinkId: link to show/hide the bcc names
 * sBccLinkContainerId: container for the above
 * bBccShowByDefault: boolean to show it on or off
 * sShowBccLinkTemplate:
 *
 * @param {type} oOptions
 */
function elk_PersonalMessageSend(oOptions)
{
	this.opt = oOptions;
	this.oBccDiv = null;
	this.oBccDiv2 = null;
	this.oToAutoSuggest = null;
	this.oBccAutoSuggest = null;
	this.oToListContainer = null;
	this.init();
}

// Initialise the PM recipient selection area
elk_PersonalMessageSend.prototype.init = function()
{
	if (!this.opt.bBccShowByDefault)
	{
		// Hide the BCC control.
		this.oBccDiv = document.getElementById(this.opt.sBccDivId);
		this.oBccDiv.style.display = 'none';
		this.oBccDiv2 = document.getElementById(this.opt.sBccDivId2);
		this.oBccDiv2.style.display = 'none';

		// Show the link to bet the BCC control back.
		var oBccLinkContainer = document.getElementById(this.opt.sBccLinkContainerId);
		oBccLinkContainer.style.display = '';
		oBccLinkContainer.innerHTML = this.opt.sShowBccLinkTemplate;

		// Make the link show the BCC control.
		var oBccLink = document.getElementById(this.opt.sBccLinkId);
		oBccLink.instanceRef = this;
		oBccLink.onclick = function() {
			this.instanceRef.showBcc();
			return false;
		};
	}

	var oToControl = document.getElementById(this.opt.sToControlId);
	this.oToAutoSuggest = new smc_AutoSuggest({
		sSelf: this.opt.sSelf + '.oToAutoSuggest',
		sSessionId: this.opt.sSessionId,
		sSessionVar: this.opt.sSessionVar,
		sSuggestId: 'to_suggest',
		sControlId: this.opt.sToControlId,
		sSearchType: 'member',
		sPostName: 'recipient_to',
		sURLMask: 'action=profile;u=%item_id%',
		sTextDeleteItem: this.opt.sTextDeleteItem,
		bItemList: true,
		sItemListContainerId: 'to_item_list_container',
		aListItems: this.opt.aToRecipients
	});
	this.oToAutoSuggest.registerCallback('onBeforeAddItem', this.opt.sSelf + '.callbackAddItem');

	this.oBccAutoSuggest = new smc_AutoSuggest({
		sSelf: this.opt.sSelf + '.oBccAutoSuggest',
		sSessionId: this.opt.sSessionId,
		sSessionVar: this.opt.sSessionVar,
		sSuggestId: 'bcc_suggest',
		sControlId: this.opt.sBccControlId,
		sSearchType: 'member',
		sPostName: 'recipient_bcc',
		sURLMask: 'action=profile;u=%item_id%',
		sTextDeleteItem: this.opt.sTextDeleteItem,
		bItemList: true,
		sItemListContainerId: 'bcc_item_list_container',
		aListItems: this.opt.aBccRecipients
	});
	this.oBccAutoSuggest.registerCallback('onBeforeAddItem', this.opt.sSelf + '.callbackAddItem');
};

// Show the bbc fields
elk_PersonalMessageSend.prototype.showBcc = function()
{
	// No longer hide it, show it to the world!
	this.oBccDiv.style.display = '';
	this.oBccDiv2.style.display = '';
};

// Prevent items to be added twice or to both the 'To' and 'Bcc'.
elk_PersonalMessageSend.prototype.callbackAddItem = function(oAutoSuggestInstance, sSuggestId)
{
	this.oToAutoSuggest.deleteAddedItem(sSuggestId);
	this.oBccAutoSuggest.deleteAddedItem(sSuggestId);

	return true;
};

/**
 * Populate the label selection pulldown after a message is selected
 */
function loadLabelChoices()
{
	var listing = document.forms.pmFolder.elements,
		theSelect = document.forms.pmFolder.pm_action,
		add,
		remove,
		toAdd = {length: 0},
		toRemove = {length: 0};

	if (theSelect.childNodes.length === 0)
		return;

	// This is done this way for internationalization reasons.
	if (!('-1' in allLabels))
	{
		for (var o = 0; o < theSelect.options.length; o++)
			if (theSelect.options[o].value.substr(0, 4) === "rem_")
				allLabels[theSelect.options[o].value.substr(4)] = theSelect.options[o].text;
	}

	for (var i = 0; i < listing.length; i++)
	{
		if (listing[i].name !== "pms[]" || !listing[i].checked)
			continue;

		var alreadyThere = [],
			x;

		for (x in currentLabels[listing[i].value])
		{
			if (!(x in toRemove))
			{
				toRemove[x] = allLabels[x];
				toRemove.length++;
			}
			alreadyThere[x] = allLabels[x];
		}

		for (x in allLabels)
		{
			if (!(x in alreadyThere))
			{
				toAdd[x] = allLabels[x];
				toAdd.length++;
			}
		}
	}

	while (theSelect.options.length > 2)
		theSelect.options[2] = null;

	if (toAdd.length !== 0)
	{
		theSelect.options[theSelect.options.length] = new Option(txt_pm_msg_label_apply);
		theSelect.options[theSelect.options.length - 1].innerHTML = txt_pm_msg_label_apply;
		theSelect.options[theSelect.options.length - 1].className = 'jump_to_header';
		theSelect.options[theSelect.options.length - 1].disabled = true;

		for (i in toAdd)
		{
			if (i !== "length")
				theSelect.options[theSelect.options.length] = new Option(toAdd[i], "add_" + i);
		}
	}

	if (toRemove.length !== 0)
	{
		theSelect.options[theSelect.options.length] = new Option(txt_pm_msg_label_remove);
		theSelect.options[theSelect.options.length - 1].innerHTML = txt_pm_msg_label_remove;
		theSelect.options[theSelect.options.length - 1].className = 'jump_to_header';
		theSelect.options[theSelect.options.length - 1].disabled = true;

		for (i in toRemove)
		{
			if (i !== "length")
				theSelect.options[theSelect.options.length] = new Option(toRemove[i], "rem_" + i);
		}
	}
}

/**
 * Rebuild the rule description!
 */
function rebuildRuleDesc()
{
	// Start with nothing.
	var text = "",
		joinText = "",
		actionText = "",
		hadBuddy = false,
		foundCriteria = false,
		foundAction = false,
		curNum,
		curVal,
		curDef;

	for (var i = 0; i < document.forms.addrule.elements.length; i++)
	{
		if (document.forms.addrule.elements[i].id.substr(0, 8) === "ruletype")
		{
			if (foundCriteria)
				joinText = document.getElementById("logic").value === 'and' ? ' ' + txt_pm_readable_and + ' ' : ' ' + txt_pm_readable_or + ' ';
			else
				joinText = '';
			foundCriteria = true;

			curNum = document.forms.addrule.elements[i].id.match(/\d+/);
			curVal = document.forms.addrule.elements[i].value;
			if (curVal === "gid")
				curDef = document.getElementById("ruledefgroup" + curNum).value.php_htmlspecialchars();
			else if (curVal !== "bud")
				curDef = document.getElementById("ruledef" + curNum).value.php_htmlspecialchars();
			else
				curDef = "";

			// What type of test is this?
			if (curVal === "mid" && curDef)
				text += joinText + txt_pm_readable_member.replace("{MEMBER}", curDef);
			else if (curVal === "gid" && curDef && groups[curDef])
				text += joinText + txt_pm_readable_group.replace("{GROUP}", groups[curDef]);
			else if (curVal === "sub" && curDef)
				text += joinText + txt_pm_readable_subject.replace("{SUBJECT}", curDef);
			else if (curVal === "msg" && curDef)
				text += joinText + txt_pm_readable_body.replace("{BODY}", curDef);
			else if (curVal === "bud" && !hadBuddy)
			{
				text += joinText + txt_pm_readable_buddy;
				hadBuddy = true;
			}
		}

		if (document.forms.addrule.elements[i].id.substr(0, 7) === "acttype")
		{
			if (foundAction)
				joinText = ' ' + txt_pm_readable_and + ' ';
			else
				joinText = "";
			foundAction = true;

			curNum = document.forms.addrule.elements[i].id.match(/\d+/);
			curVal = document.forms.addrule.elements[i].value;
			if (curVal === "lab")
				curDef = document.getElementById("labdef" + curNum).value.php_htmlspecialchars();
			else
				curDef = "";

			// Now pick the actions.
			if (curVal === "lab" && curDef && labels[curDef])
				actionText += joinText + txt_pm_readable_label.replace("{LABEL}", labels[curDef]);
			else if (curVal === "del")
				actionText += joinText + txt_pm_readable_delete;
		}
	}

	// If still nothing make it default!
	if (text === "" || !foundCriteria)
		text = txt_pm_rule_not_defined;
	else
	{
		if (actionText !== "")
			text += ' ' + txt_pm_readable_then + ' ' + actionText;
		text = txt_pm_readable_start + text + txt_pm_readable_end;
	}

	// Set the actual HTML!
	document.getElementById("ruletext").innerHTML = text;
}

/**
 * Add a new rule criteria for PM filtering
 */
function addCriteriaOption()
{
	if (criteriaNum === 0)
	{
		for (var i = 0; i < document.forms.addrule.elements.length; i++)
			if (document.forms.addrule.elements[i].id.substr(0, 8) === "ruletype")
				criteriaNum++;
	}
	criteriaNum++;

	// group selections
	var group_option = '';
	for (var index in groups)
		group_option += '<option value="' + index + '">' + groups[index] + '</option>';

	setOuterHTML(document.getElementById("criteriaAddHere"), '<br /><select name="ruletype[' + criteriaNum + ']" id="ruletype' + criteriaNum + '" onchange="updateRuleDef(' + criteriaNum + ');rebuildRuleDesc();"><option value="">' + txt_pm_rule_criteria_pick + ':</option><option value="mid">' + txt_pm_rule_mid + '</option><option value="gid">' + txt_pm_rule_gid + '</option><option value="sub">' + txt_pm_rule_sub + '</option><option value="msg">' + txt_pm_rule_msg + '</option><option value="bud">' + txt_pm_rule_bud + '</option></select>&nbsp;<span id="defdiv' + criteriaNum + '" style="display: none;"><input type="text" name="ruledef[' + criteriaNum + ']" id="ruledef' + criteriaNum + '" onkeyup="rebuildRuleDesc();" value="" class="input_text" /></span><span id="defseldiv' + criteriaNum + '" style="display: none;"><select name="ruledefgroup[' + criteriaNum + ']" id="ruledefgroup' + criteriaNum + '" onchange="rebuildRuleDesc();"><option value="">' + txt_pm_rule_sel_group + '</option>' + group_option + '</select></span><span id="criteriaAddHere"></span>');
}

/**
 * Add a new action for a defined PM rule
 */
function addActionOption()
{
	if (actionNum === 0)
	{
		for (var i = 0; i < document.forms.addrule.elements.length; i++)
			if (document.forms.addrule.elements[i].id.substr(0, 7) === "acttype")
				actionNum++;
	}
	actionNum++;

	// Label selections
	var label_option = '';
	for (var index in labels)
		label_option += '<option value="' + index + '">' + labels[index] + '</option>';

	setOuterHTML(document.getElementById("actionAddHere"), '<br /><select name="acttype[' + actionNum + ']" id="acttype' + actionNum + '" onchange="updateActionDef(' + actionNum + ');rebuildRuleDesc();"><option value="">' + txt_pm_rule_sel_action + ':</option><option value="lab">' + txt_pm_rule_label + '</option><option value="del">' + txt_pm_rule_delete + '</option></select>&nbsp;<span id="labdiv' + actionNum + '" style="display: none;"><select name="labdef[' + actionNum + ']" id="labdef' + actionNum + '" onchange="rebuildRuleDesc();"><option value="">' + txt_pm_rule_sel_label + '</option>' + label_option + '</select></span><span id="actionAddHere"></span>');
}

/**
 * Maintains the personal message rule action options to conform with the action choice
 * so that the form only makes available the proper choice
 *
 * @param {string} optNum
 */
function updateActionDef(optNum)
{
	if (document.getElementById("acttype" + optNum).value === "lab")
	{
		document.getElementById("labdiv" + optNum).style.display = "";
	}
	else
	{
		document.getElementById("labdiv" + optNum).style.display = "none";
	}
}