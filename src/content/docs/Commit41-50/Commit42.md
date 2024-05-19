---
title: 42. CLI Options
---

## commit log

```plaintext
Add -o and --help options
```

  为了后续开发的便利，我们把解析出来的汇编代码利用`-o`给保存到一个`.s`文件里面，这就需要添加选项了。

## 头文件

主要修改的地方是codegen，原先我们只是将其print出来，现在要允许将其打印到一个文件里面：

```c
void codegen(Obj* prog, FILE* out);
```

## Codegen

我们在上一次commit的时候是把所有的printf都给换成了println，所以这一次我们只需要修改println函数就可以了。

```c
static FILE* output_file;

static void println(char* fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  vfprintf(output_file, fmt, ap);
  va_end();
  fprintf(output_file, "\n");
}

void codegen(Obj* prog, FILE* out) {
  output_file = out;
  // other code
}
```

## main

主要修改的点就在于main函数

```c++
static char *opt_o;
static char *input_path;

int main(int argc, char* argv[]) {
  parse_args(argc, argv);

  Token *tok = tokenize_file(input_path);
  Obj *prog = parse(tok);

  FILE* out = open_file(opt_o);
  codegen(prog, out);
  return 0;
}
```

在实现其中的一些函数之前，先来实现一个`usage`函数，来输出帮助信息，用来处理`--help`选项，以及出错时的帮助提醒。

```c
static void usage(int status) {
  fprintf(stderr, "chibicc [ -o <path> ] <file>\n");
  exit(status);
}
```

然后来实现`parse_args`函数：

```c
static void parse_args(int argc, char* argv[]) {
  for(int i = 1; i < argc; i++) {
    if (0 == strcmp(argv[i], "--help")) {
      usage(0);
    }
    if (0 == strcmp(argv[i], "-o")) {
      if (!argv[++i])
        usage(1);
      opt_o = argv[i];
      continue;
    }

    if (0 == strncmp(argv[i], "-o", 2)) {
      opt_o = argv[i] + 2;
      continue;
    }

    if (argv[i][0] == '-' && argv[i][1] != '\0') {
      error("unknown argument: %s", argv[i]);
    }

    input_path = argv[i];
  }

  if (!input_path) 
    error("no input files");
}
```

然后实现`open_file`函数：

```c
static FILE* open_file(char* path) {
  if (!path || strncmp(path, "-") == 0) 
    return stdout;

  FILE* out = fopen(path, "w");
  if (!out)
    error("cannot open output file: %s : %s", path, stderror(errno));
  return out;
}
```

## test

最后需要修改整个的测试逻辑：

## test.sh

```bash
# ...
echo "$input" | ./chibicc -o tmp.s - || exit
# ...
```

这里我们添加一个`test-driver.sh`，用来测试用文件写成的代码。不过暂时只能测试`--help`和`-o`的正确性。

```bash
#!/bin/sh
tmp=`mktemp -d /tmp/chibicc-test-XXXXXX`
trap 'rm -rf $tmp' INT TERM HUP EXIT   
# trap捕捉信号，后面是命令，在后面是要捕捉的信号种类
# 就是说，当捕捉到后面的信号的时候，执行命令
# INT 中断，通常由CTRL+C引发（注意不是在程序运行的时候按CTRL+C，是在终端中按）
# TERM，终止，通常那个在系统关机时发送
# HUP，挂起，通常因终端掉线或用户退出而引发
# EXIT，结束
echo > $tmp/empty.c

check() {
    if [ $? -eq 0 ]; then
        echo "testing $1 ... passed"
    else
        echo "testing $1 ... failed"
        exit 1
    fi  
}

# -o
rm -f $tmp/out
./chibicc -o $tmp/out $tmp/empty.c
[ -f $tmp/out ]    # [ ] 内部储存一个表达式，-f 是说后面的是否是一个普通文件，是的话返回0
check -o

# --help
./chibicc --help 2>&1 | grep -q chibicc
check --help

echo OK
```

最后修改一下`Makefile`：

```Makefile
test: chibicc
    ./test.sh
    ./test-driver.sh
```

‍
