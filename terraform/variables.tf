variable "kubeconfig_path" {
  description = "Caminho para o arquivo kubeconfig"
  type        = string
  default     = "~/.kube/config"
}

variable "namespace" {
  description = "Namespace Kubernetes da aplicação"
  type        = string
  default     = "mkjs"
}
