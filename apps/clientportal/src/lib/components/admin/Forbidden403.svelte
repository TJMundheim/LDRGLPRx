<script lang="ts">
</script>

<div class="forbidden">
  <div class="code">403</div>
  <div class="message">Admins only</div>
  <p class="detail">You do not have permission to view this page.</p>
</div>

<style>
  .forbidden {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 32px;
    text-align: center;
  }

  .code {
    font-size: 5rem;
    font-weight: 800;
    color: #ff6060;
    line-height: 1;
    margin-bottom: 12px;
  }

  .message {
    font-size: 1.5rem;
    font-weight: 700;
    color: #cdd4e0;
    margin-bottom: 12px;
  }

  .detail {
    font-size: 0.9rem;
    color: #7a8390;
    margin: 0;
  }
</style>
