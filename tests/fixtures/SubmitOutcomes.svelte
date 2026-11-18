<script lang="ts">
  // A page the server renders after a form post, carrying the outcome of the
  // submit in each surface that reports one.
  import Alert from '../../src/lib/components/Alert.svelte';
  import Banner from '../../src/lib/components/Banner.svelte';
  import FormMessage from '../../src/lib/components/FormMessage.svelte';
</script>

<Banner tone="success" announce>Plan changed.</Banner>
<Alert tone="success" autoDismiss>Webhook saved.</Alert>
<FormMessage tone="success">Settings saved.</FormMessage>
