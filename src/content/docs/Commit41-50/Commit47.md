---
title: 47. Assembler Directives
---

## commit log

```plaintext
Emit .file and .loc assembler directives
  
With these directives, gdb can print out an error location when
a compiled program crashes.
```

我们日常有调试代码的需求，因此日常当发生问题的时候，我们会添加`-g`选项，来在编译的时候加上调试信息。

调试信息分成两种，第一种是`.file`，用来指示代码的文件名称，另一种是`.loc`用于指示每一个表达式，每一个stmt的行数。

添加过程也比较简单，修改codegen文件即可。

## Codegen

```c
static void gen_expr(Node *node) {
  println("  .loc 1 %d", node->tok->line_no);
  // code
}

static void gen_stmt(Node *node) {
  println("  .loc 1 %d", node->tok->line_no);
  // code
}
```

## main函数

其实可以在codegen函数的最开始处加上`.file`信息的，不过chibicc这里是在main函数里面加上的，我们也在main函数里面加上。

```c
int main() {
  // code
  fprintf(out, ".file 1 \" %s\" \n", input_path);
  codegen(prog, out);
  return 0;
}
```

‍
