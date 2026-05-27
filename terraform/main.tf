terraform {
  required_version = ">= 1.5"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

resource "kubernetes_namespace" "mkjs" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_config_map" "mkjs_config" {
  metadata {
    name      = "mkjs-config"
    namespace = kubernetes_namespace.mkjs.metadata[0].name
  }

  data = {
    PORT          = "3000"
    POSTGRES_DB   = "mkjs"
    POSTGRES_USER = "mkjs"
  }
}
