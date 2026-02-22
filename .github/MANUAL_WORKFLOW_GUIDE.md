# Manual Workflow Triggering Guide

All infrastructure deployments are **manual only** to preserve Azure credits.

## How to Trigger Workflows

### Via GitHub Web UI (Recommended)

1. **Go to Actions tab**
   - Click "Actions" in repository navigation
   - Or go to: `https://github.com/YOUR_ORG/YOUR_REPO/actions`

2. **Select "Deploy Infrastructure" workflow**
   - Click the workflow name in left sidebar
   - Or search for "Deploy Infrastructure"

3. **Click "Run workflow" button**
   - Top right corner (may say "This workflow has no runs")
   - Dropdown appears with options

4. **Select action**
   ```
   Choose a branch: main (default)

   Choose action:
   ○ plan          (preview changes)
   ○ apply         (deploy to Azure)
   ○ destroy-plan  (preview destruction)
   ```

5. **Click "Run workflow" button**
   - Workflow starts immediately
   - View live logs in next page

### Via GitHub CLI

If you have `gh` CLI installed:

```bash
# View available workflows
gh workflow list

# List recent runs
gh run list --workflow deploy.yml

# Trigger plan
gh workflow run deploy.yml -f action=plan

# Trigger apply
gh workflow run deploy.yml -f action=apply

# Trigger destroy plan
gh workflow run deploy.yml -f action=destroy-plan

# Watch live
gh run watch
```

## Workflow Actions Explained

### Action: `plan`

**What it does:**
- Initializes Terraform with Azure backend
- Validates configuration
- Runs `terraform plan`
- Shows proposed changes

**When to use:**
- Preview infrastructure changes before applying
- Share plan output with team for review
- Test configuration syntax
- Estimate impact

**Output:**
- Displays plan summary in workflow logs
- Downloads plan file as artifact (if needed)
- Safe to run anytime - no resources modified

**Example:**
```
$ gh workflow run deploy.yml -f action=plan

✓ Created workflow run 12345
Visit: https://github.com/YOUR_ORG/YOUR_REPO/actions/runs/12345
```

### Action: `apply`

**What it does:**
- Plans changes again (safety check)
- Displays planned changes for review
- Applies Terraform configuration
- Deploys resources to Azure
- Exports outputs (FQDN, registry URL, etc.)

**When to use:**
- After reviewing plan output
- When you're ready to deploy
- After infrastructure changes approved

**Safety features:**
- Plans before applying (catch unexpected changes)
- Shows summary in workflow logs
- All changes logged to Azure Activity Log
- Can be reverted with `destroy-plan` action

**Example:**
```
$ gh workflow run deploy.yml -f action=apply

✓ Created workflow run 12346
Visit: https://github.com/YOUR_ORG/YOUR_REPO/actions/runs/12346

# Watch live logs
$ gh run watch 12346
```

### Action: `destroy-plan`

**What it does:**
- Plans destruction of all resources
- Shows what would be deleted
- **Does NOT delete anything**
- Outputs destruction plan

**When to use:**
- Preview what would be destroyed
- Plan infrastructure decommissioning
- Verify before manual destruction

**Output:**
- Lists all resources marked for deletion
- Shows impact
- Plan file available as artifact

**Important:**
This is preview only. To actually destroy:
```bash
cd infrastructure/terraform
terraform destroy
```

## Monitoring Workflow Progress

### In GitHub UI

1. **Go to Actions tab**
2. **Click the workflow run** (blue check/yellow dot/red X)
3. **View live progress:**
   - Job status (running, completed, failed)
   - Individual step logs
   - Expanded output for each step

### In Terminal

```bash
# Watch a specific run live
gh run watch 12345

# View logs after completion
gh run view 12345 --log

# List recent runs
gh run list --workflow deploy.yml --limit 10
```

## Viewing Outputs and Artifacts

### Workflow Summary (Best for Terraform output)

1. Click completed workflow run
2. Scroll down to "Summary" section
3. See `terraform show` output
4. Outputs highlighted (server FQDN, registry, etc.)

### Download Artifacts

1. Click completed workflow run
2. Scroll down to "Artifacts" section
3. Download files:
   - `terraform-plan` - Plan file for inspection
   - `terraform-apply-artifacts` - State info

### Workflow Logs

```bash
# Export full logs
gh run view 12345 --log > workflow.log

# Search logs
gh run view 12345 --log | grep "azurerm_container_app"

# Check for errors
gh run view 12345 --log | grep -i error
```

## Troubleshooting Manual Workflows

### Workflow Won't Start

**Problem:** Button grayed out or doesn't respond

**Solutions:**
1. Refresh the page (F5)
2. Check you have push permissions
3. Verify workflow file syntax: `.github/workflows/deploy.yml`
4. Check branch is `main` (workflows run on that branch)

### Can't Find "Run workflow" Button

**Problem:** No "Run workflow" button visible

**Solution:**
1. Make sure you're on the workflow file view
2. Try: Actions tab → Deploy Infrastructure (left sidebar)
3. Or direct URL: `https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/deploy.yml`

### Workflow Fails Immediately

**Problem:** Run shows ✗ (failed) after seconds

**Common causes:**
- Missing GitHub Secrets (AZURE_*)
- Invalid Azure credentials
- Terraform backend misconfigured

**Debug:**
```bash
gh run view <run-id> --log | head -100
```

### State Lock Timeout

**Problem:** Workflow fails with "Error acquiring the state lock"

**Cause:** Previous workflow didn't release lock (crashed)

**Solution:**
```bash
# Check locked state in Azure
az storage blob show \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate

# Force unlock (be careful!)
cd infrastructure/terraform
terraform force-unlock <lock-id>
```

## Best Practices

### Before Running Apply

1. ✅ Run `plan` action first
2. ✅ Review plan output thoroughly
3. ✅ Verify no unexpected deletions
4. ✅ Check cost impact
5. ✅ Verify Azure authentication works
6. ✅ Only then run `apply`

### Workflow Timing

- **Plan:** Usually 30-60 seconds
- **Apply:** 2-5 minutes (depends on resource complexity)
- **Destroy Plan:** 30-60 seconds

### Monitoring Deployments

After triggering `apply`:
1. Watch workflow logs for completion
2. Check Azure resource status
3. Verify server is running: `az containerapp logs show`
4. Test connectivity to server FQDN

### Rollback Procedure

If apply goes wrong:

```bash
# Option 1: Use previous state version
cd infrastructure/terraform
git log --oneline infrastructure/
git revert <bad-commit>
git push origin main

# Then trigger apply again

# Option 2: Manual investigation
az containerapp show -g language-rg -n language-server
```

## Reference

| Task | Command |
|------|---------|
| List workflows | `gh workflow list` |
| Trigger plan | `gh workflow run deploy.yml -f action=plan` |
| Trigger apply | `gh workflow run deploy.yml -f action=apply` |
| Watch run | `gh run watch <run-id>` |
| View logs | `gh run view <run-id> --log` |
| List runs | `gh run list --workflow deploy.yml` |
| Download artifact | `gh run download <run-id> --dir .` |

## Related Guides

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment workflow details
- [TERRAFORM_QUICKSTART.md](../TERRAFORM_QUICKSTART.md) - Getting started
- [infrastructure/AZURE_DEPLOYMENT_GUIDE.md](../infrastructure/AZURE_DEPLOYMENT_GUIDE.md) - Azure setup
